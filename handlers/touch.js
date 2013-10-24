/**
 * this module listen to touch events and generates corresponding pointer events.
 *
 * http://www.w3.org/TR/touch-events/#list-of-touchevent-types
 * todo: pointerenter/pointerleave: generate on capture when target is the originated element.
 */
define([
	"./utils"
], function (utils) {
	"use strict";

	var TouchEvents = {
			touchstart: "touchstart",
			touchmove: "touchmove",
			touchend: "touchend",
			touchcancel: "touchcancel"
		},
		DoubleTap = { // allow to track click and determine if a double click/tap event can be fired.
			TAP_DELAY: 250, // maximum delay between 2 clicks in ms, after this delay a dblclick won't be generated
			lastClickTS: 0, // timestamp of the last click
			hasFirstClick: false, // are we waiting for a second click?
			targetElement: null, // element which received the click
			isEligible: function (target) {
				return this.hasFirstClick && (this.targetElement === target) &&
					((new Date().getTime()) - this.lastClickTS < this.TAP_DELAY);
			}
		};

	/**
	 * touchstart event handler.
	 *
	 * @param e touch event
	 */
	function touchstart(e) {
		var touch, touchTarget, touchAction;
		for (var l = e.changedTouches.length, i = 0; i < l; i++) {
			touch = e.changedTouches.item(i);
			touchTarget = null;
			touchAction = utils.getTouchAction(touch.target);
			// before doing anything, we check if there is already an active primary pointer:
			// if default touch action!=auto on the target element, the touch action must be
			// handled by the user agent. The current event is related to a new pointer which contributes to a
			// multi touch gesture: we must absorb this event and cancel the primary pointer to let the user agent
			// handle the default action.
			if (TouchTracker.hasPrimary() && (touchAction === utils.TouchAction.AUTO)) {
				// fire pointerout > pointercancel for current primary pointer
				var lastNativeEvent = TouchTracker.getPrimaryTouchEvent();
				var lastTouch = TouchTracker.getPrimaryTouch();
				touchTarget = TouchTracker.identifyPrimaryTouchTarget(lastTouch.target);
				utils.dispatchEvent(touchTarget, createPointer(utils.events.OUT, lastNativeEvent, lastTouch, {}));
				utils.dispatchEvent(touchTarget, createPointer(utils.events.CANCEL, lastNativeEvent, lastTouch, {}));
				TouchTracker.implicitReleaseCapture(lastTouch.identifier);
				// cancel the primary pointer to avoid duplicate generation of PointerOut > PointerCancel
				TouchTracker.unregister(lastTouch.identifier);
			} else {
				if (touchAction !== utils.TouchAction.AUTO) {
					if (DoubleTap.isEligible(touch.target)) {
						e.preventDefault(); // prevent zoom on double tap
					}
				}
				// primary touch pointer must be defined in case an event handler on pointerdown decides
				// to set a pointer capture on the element, so we must:
				// - register the pointer *before* firing the events.
				// - update the tracker *before* firing the events.
				TouchTracker.register(touch.identifier, touchAction);
				TouchTracker.update(touch, e, touch.target);
				// fire pointerover > pointerdown
				utils.dispatchEvent(touch.target, createPointer(utils.events.OVER, e, touch, {}));
				utils.dispatchEvent(touch.target, createPointer(utils.events.DOWN, e, touch, {}));
			}
		}
	}

	/**
	 * touchmove event handler.
	 *
	 * @param e touch event
	 */
	function touchmove(e) {
		var touch;
		for (var l = e.changedTouches.length, i = 0; i < l; i++) {
			touch = e.changedTouches.item(i);
			if (!TouchTracker.isActive(touch.identifier)) {
				return;
			}
			// browser default actions
			if (TouchTracker.getTouchAction(touch.identifier) === utils.TouchAction.AUTO) {
				var lastNativeEventType = TouchTracker.getTouchEvent(touch.identifier).type;
				switch (lastNativeEventType) {
				case TouchEvents.touchstart:
					// (1) fire PointerOut > PointerCancel
					utils.dispatchEvent(touch.target, createPointer(utils.events.OUT, e, touch, {}));
					utils.dispatchEvent(touch.target, createPointer(utils.events.CANCEL, e, touch, {}));
					break;
				case TouchEvents.touchmove:
					// (2) do not fire synthetic event: absorb the touchmove.
					break;
				default:
					// events flow already ended (previous touchmove already removed pointer from tracker to
					// prevent PointerEvent to be fired)
				}
				TouchTracker.implicitReleaseCapture(touch.identifier);
				TouchTracker.unregister(touch.identifier);
			} else { // always map PointerMove when touch action is set (none/pan-x/pan-y)
				var touchTarget = TouchTracker.identifyTouchTarget(touch.identifier, elementFromTouch(touch));
				var lastElementFromPoint = TouchTracker.getTargetElement(touch.identifier);
				// check if the pointer is moving out from the current target element
				if (touchTarget !== lastElementFromPoint) {
					// expected sequence of events:
					// PointerOut (on previous elt) > PointerMove (on current elt) >  PointerOver (on current elt)
					utils.dispatchEvent(lastElementFromPoint,
						createPointer(utils.events.OUT, e, touch, {relatedTarget: touchTarget}));
					// generate pointerleave event(s)
					utils.dispatchLeaveEvents(lastElementFromPoint, touchTarget,
						createPointer(utils.events.LEAVE, e, touch, {relatedTarget: touchTarget, bubbles: false}));
					// generate pointermove
					utils.dispatchEvent(touchTarget, createPointer(utils.events.MOVE, e, touch, {}));
					// generate pointerover
					utils.dispatchEvent(touchTarget,
						createPointer(utils.events.OVER, e, touch, {relatedTarget: lastElementFromPoint}));
					// generate pointerenter event(s)
					utils.dispatchEnterEvents(touchTarget, lastElementFromPoint,
						createPointer(utils.events.ENTER, e, touch,
							{relatedTarget: lastElementFromPoint, bubbles: false}));
				} else {
					utils.dispatchEvent(touchTarget, createPointer(utils.events.MOVE, e, touch, {}));
				}
				TouchTracker.update(touch, e, touchTarget);
				// default actions must be prevented
				e.preventDefault();
			}
		}
	}

	/**
	 * touchend event handler.
	 *
	 * @param e touch event
	 */
	function touchend(e) {
		var touch;
		for (var l = e.changedTouches.length, i = 0; i < l; i++) {
			touch = e.changedTouches.item(i);
			if (!TouchTracker.isActive(touch.identifier)) {
				return;
			}
			var lastNativeEventType = TouchTracker.getTouchEvent(touch.identifier).type;
			// elementFromPoint may return null on android when user makes a pinch 2 zoom gesture
			// in that case we use the current touch.target.
			var elementFromPoint = elementFromTouch(touch) || touch.target;
			var touchTarget = TouchTracker.identifyTouchTarget(touch.identifier, elementFromPoint);
			if (TouchTracker.getTouchAction(touch.identifier) === utils.TouchAction.AUTO) {
				// default action handled by user agent
				switch (lastNativeEventType) {
				case TouchEvents.touchmove:
					// (3) do not generate pointer event
					break;
				case TouchEvents.touchstart:
					// (5) fire pointermove > pointerup > pointerOut
					utils.dispatchEvent(touchTarget, createPointer(utils.events.MOVE, e, touch, {}));
					utils.dispatchEvent(touchTarget, createPointer(utils.events.UP, e, touch, {}));
					utils.dispatchEvent(touchTarget, createPointer(utils.events.OUT, e, touch, {}));
					break;
				default:
					// unexpected behavior:
					// touchend event with touch action=auto and lastNativeEventType=[" + lastNativeEventType + "]");
				}
			} else {
				switch (lastNativeEventType) {
				case TouchEvents.touchstart:
					// (6) fire pointermove > pointerup > fast click > pointerout
					utils.dispatchEvent(touchTarget, createPointer(utils.events.MOVE, e, touch, {}));
					utils.dispatchEvent(touchTarget, createPointer(utils.events.UP, e, touch, {}));
					fireSyntheticClick(touchTarget, touch);
					utils.dispatchEvent(touchTarget, createPointer(utils.events.OUT, e, touch, {}));
					break;
				case TouchEvents.touchmove:
					// (4) fire pointerup > fast click > pointerout
					utils.dispatchEvent(touchTarget, createPointer(utils.events.UP, e, touch, {}));
					// fire synthetic click only if pointer is released on the origin element
					// (touch.target is the target element from the touchstart)
					if (elementFromPoint === touch.target) {
						fireSyntheticClick(touchTarget, touch);
					}
					utils.dispatchEvent(touchTarget, createPointer(utils.events.OUT, e, touch, {}));
					break;
				default:
					// unexpected behavior:
					// "touchend event with touch action!=auto and lastNativeEventType=[" + lastNativeEventType + "]"
				}
			}
			TouchTracker.implicitReleaseCapture(touch.identifier);
			TouchTracker.unregister(touch.identifier);
		}
	}

	/**
	 * touchcancel event handler.
	 *
	 * @param e touch event
	 */
	function touchcancel(e) {
		var touch;
		for (var l = e.changedTouches.length, i = 0; i < l; i++) {
			touch = e.changedTouches.item(i);
			if (!TouchTracker.isActive(touch.identifier)) {
				return;
			}
			utils.dispatchEvent(TouchTracker.identifyTouchTarget(touch.identifier, elementFromTouch(touch)),
				createPointer(utils.events.CANCEL, e, touch, {}));
			TouchTracker.implicitReleaseCapture(touch.identifier);
			TouchTracker.unregister(touch.identifier);
		}
	}

	/**
	 * create a synthetic Pointer event based on a touch event.
	 *
	 * @param pointerType pointer event type name ("pointerdown", "pointerup"...)
	 * @param touchEvent the underlying touch event which contributes to the creation of the pointer event.
	 * @param touch the underlying touch element which contributes to the creation of the pointer event.
	 * @param props event properties (optional)
	 * @returns {utils.Pointer}
	 */
	function createPointer(pointerType, touchEvent, touch, props) {
		props = props || {};
		// Mouse Event properties
		props.screenX = touch.screenX;
		props.screenY = touch.screenY;
		props.clientX = touch.clientX;
		props.clientY = touch.clientY;
		props.ctrlKey = touchEvent.ctrlKey;
		props.altKey = touchEvent.altKey;
		props.shiftKey = touchEvent.shiftKey;
		props.metaKey = touchEvent.metaKey;
		if (TouchTracker.hasCapture(touch.identifier)) {  // W3C spec §10.1
			props.relatedTarget = null;
		}
		// normalize button/buttons values
		// http://www.w3.org/TR/pointerevents/#chorded-button-interactions
		// for pointer: button=0, buttons=1, which=1 for all events but PointerMove: button=-1,buttons=0,which=0
		// as it is not possible to assign negative value to button(s), just use 0.
		props.button = 0;
		props.buttons = 1;
		props.which = 1;
		// Pointer Events properties
		props.pointerId = touch.identifier + 2; // avoid id collision: 1 is reserved for mouse events mapping
		props.pointerType = "touch";
		props.isPrimary = TouchTracker.isPrimary(touch.identifier);
		return new utils.Pointer(pointerType, touchEvent, props);
	}

	/**
	 * Create and dispatch synthetic events click and dblclick (if eligible).
	 *
	 * @param target
	 * @param touch
	 */
	function fireSyntheticClick(target, touch) {
		// IE10 always generates a click for every pointer when there is multiple touches
		// todo: investigate how IE11 handles clicks when there is multiple touches
		if (TouchTracker.isPrimary(touch.identifier)) {
			// here we choose to fire click/dblclick only for primary pointer
			utils.dispatchEvent(target, utils.createSyntheticClick(touch));
			// dispatch double tap if eligible
			if (DoubleTap.isEligible(target)) {
				utils.dispatchEvent(target, utils.createSyntheticClick(touch, true));
				DoubleTap.hasFirstClick = false;
			} else {
				// remember first click
				DoubleTap.hasFirstClick = true;
				DoubleTap.lastClickTS = (new Date().getTime());
				DoubleTap.targetElement = target;
			}
		}
	}

	/**
	 * returns the deeply nested dom element at window coordinates from a touch element.
	 *
	 * @param touch the touch element
	 * @return HTMLElement the DOM element.
	 */
	function elementFromTouch(touch) {
		//todo: investigate #15821 (different behaviors?)
		return touch.target.ownerDocument.elementFromPoint(touch.pageX, touch.pageY);
	}

	// todo:refactor + document TouchTracker/TouchInfo
/*	function TouchInfo(touchId, touchAction) {
		this.touchId = touchId;
		this.touchAction = 0;
		this.lastNativeEvent = null;
		this.lastTargetElement = null;
		this.captureTarget = null;
	}*/
	var TouchTracker = {
		// touchId of the primary pointer, or -1 if no primary pointer set.
		primaryTouchId: -1,
		register: function (touchId, touchAction) {
			// the first touch to register becomes the primary pointer
			if (this.primaryTouchId === -1) {
				this.primaryTouchId = touchId;
			}
			this[touchId] = {};
			this[touchId]._touchAction = touchAction;
		},
		update: function (touch, touchEvent, targetElement) {
			this[touch.identifier]._lastTouch = touch;
			this[touch.identifier]._lastNativeEvent = touchEvent;
			this[touch.identifier]._lastTargetElement = targetElement;
		},
		getTouchAction: function (touchId) {
			return this[touchId]._touchAction;
		},
		getTouch: function (touchId) {
			return this[touchId]._lastTouch;
		},
		getTouchEvent: function (touchId) {
			return this[touchId]._lastNativeEvent;
		},
		getTargetElement: function (touchId) {
			return this[touchId]._lastTargetElement;
		},
		unregister: function (touchId) {
			if (this.primaryTouchId === touchId) {
				this.primaryTouchId = -1;
			}
			return (delete this[touchId]);
		},
		isActive: function (touchId) {
			return (touchId in this);
		},
		// touch target depends whether capture has been set on the pointer
		identifyTouchTarget: function (touchId, nonCapturedElement) {
			return (this[touchId] && this[touchId]._captureTarget) || nonCapturedElement;
		},
		hasPrimary: function () {
			return (this.primaryTouchId !== -1);
		},
		isPrimary: function (touchId) {
			return (this.primaryTouchId === touchId);
		},
		getPrimaryTouchEvent: function () {
			return this[this.primaryTouchId]._lastNativeEvent;
		},
		getPrimaryTouch: function () {
			return this[this.primaryTouchId]._lastTouch;
		},
		identifyPrimaryTouchTarget: function (nonCapturedElement) {
			return this.identifyTouchTarget(this.primaryTouchId, nonCapturedElement);
		},
		setCapture: function (touchId, targetElement) {
			// 1. check if pointer is active, otw throw DOMException with the name InvalidPointerId.
			if (!this.isActive(touchId)) {
				throw "InvalidPointerId";
			}
			// 2. pointer must have active buttons, otherwise return
			// 3. register capture on this element.
			this[touchId]._captureTarget = targetElement;
			// 4. Fire a gotpointercapture event at the targetElement
			utils.dispatchEvent(this.getTouch(touchId).target,
				createPointer(utils.events.GOTCAPTURE, this.getTouchEvent(touchId), this.getTouch(touchId), {}));
			return true;
		},
		hasCapture: function (touchId) {
			return !!(this[touchId]._captureTarget);
		},
		releaseCapture: function (touchId, targetElement, implicit) {
			// 1. check if pointerId is active, otw throw DOMException with the name InvalidPointerId.
			if (!this.isActive(touchId)) {
				throw "InvalidPointerId";
			}
			// 2. if pointer capture not set at targetElement, return
			if (!implicit && (this[touchId]._captureTarget !== targetElement)) {
				return false;
			}
			// 3. release capture
			if (this[touchId]._captureTarget) {
				this[touchId]._captureTarget = null;
				// 4. Fire a lostpointercapture event at the targetElement
				utils.dispatchEvent(TouchTracker.getTouch(touchId).target,
					createPointer(utils.events.LOSTCAPTURE, TouchTracker.getTouchEvent(touchId),
						TouchTracker.getTouch(touchId), {}));
			}
			return true;
		},
		implicitReleaseCapture: function (touchId) {
			return this.releaseCapture(touchId, null, true);
		}
	};

	return {
		/**
		 * register touch events handlers.
		 *
		 * @param targetElement target element for touch event listeners
		 */
		registerHandlers: function (targetElement) {
			targetElement = targetElement || window.document;
			utils.addEventListener(targetElement, TouchEvents.touchstart, touchstart, true);
			utils.addEventListener(targetElement, TouchEvents.touchmove, touchmove, true);
			utils.addEventListener(targetElement, TouchEvents.touchend, touchend, true);
			utils.addEventListener(targetElement, TouchEvents.touchcancel, touchcancel, true);
		},

		/**
		 * deregister touch events handlers.
		 *
		 * @param targetElement target element for touch  event listeners
		 */
		deregisterHandlers: function (targetElement) {
			utils.removeEventListener(targetElement, TouchEvents.touchstart, touchstart, true);
			utils.removeEventListener(targetElement, TouchEvents.touchmove, touchmove, true);
			utils.removeEventListener(targetElement, TouchEvents.touchend, touchend, true);
			utils.removeEventListener(targetElement, TouchEvents.touchcancel, touchcancel, true);
		},

		/**
		 * Set Pointer capture.
		 *
		 * @param targetElement DOM element to be captured by the pointer
		 * @param pointerId Id of the capturing Pointer
		 */
		setPointerCapture: function (targetElement, pointerId) {
			return TouchTracker.setCapture(pointerId - 2, targetElement);
		},

		/**
		 * Release Pointer capture.
		 *
		 * @param targetElement DOM element to be captured by the pointer
		 * @param pointerId Id of the capturing Pointer
		 */
		releasePointerCapture: function (targetElement, pointerId) {
			return TouchTracker.releaseCapture(pointerId - 2, targetElement, false);
		}
	};
});