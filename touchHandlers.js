/**
 * -----------------------------------------------------------
 * pointer events: native touch events handlers.
 * touchstart, touchend, touchcancel, touchmove.
 * http://www.w3.org/TR/touch-events/#list-of-touchevent-types
 * -----------------------------------------------------------
 */
define([
	"pointer/events"
],
	function (events) {
		"use strict";

		/**
		 * Touch events type name
		 */
		var TouchEvents = {
			touchstart: "touchstart",
			touchend: "touchend",
			touchcancel: "touchcancel",
			touchmove: "touchmove"
		};

		/**
		 * Allow to track click  and determine if a double click/tap event can be fired.
		 */
		var DoubleTap = {
			TAP_DELAY: 250,
			lastClickTS: 0,
			hasFirstClick: false,
			targetElement: null,
			/**
			 * return true if a double click/tap can be fired.
			 * @returns {boolean}
			 */
			isEligible: function (targetElement) {
				return (this.hasFirstClick && (this.targetElement == targetElement) && ((new Date().getTime()) - this.lastClickTS < this.TAP_DELAY));
			},
			/**
			 * reset click tracker, must be called after a double click/tap is fired.
			 */
			reset: function () {
				this.hasFirstClick = false;
			},
			/**
			 * call this method after a (single) click is fired.
			 */
			registerClick: function (targetElement) {
				this.hasFirstClick = true;
				this.lastClickTS = (new Date().getTime());
				this.targetElement = targetElement;
			}
		};

		function TouchInfo(touchId, touchAction){
			this.touchId = touchId;
			this.touchAction = 0;
			this.lastNativeEvent = null;
			this.lastTargetElement = null;
			this.captureTarget = null;
		}

		// todo: refactor it, use array of "TouchInfo" objects to track number of active touches.
		var TouchTracker = {
			// touchId of the primary pointer, or -1 if no primary pointer set.
			primaryTouchId: -1,
			register: function (touchId, touchAction) {
				//console.log("TouchTracker::register[" + touchId + "] = " + (this[touchId]));
				// the first touch to register becomes the primary pointer
				if (this.primaryTouchId == -1) this.primaryTouchId = touchId;
				this[touchId] = {};
				this[touchId]._touchAction = touchAction;
				//
				//this[touchId] = new TouchInfo(touchId, touchAction);
			},
			update: function (touch, touchEvent, targetElement) {
				this[touch.identifier]._lastTouch = touch;
				this[touch.identifier]._lastNativeEvent = touchEvent;
				this[touch.identifier]._lastTargetElement = targetElement;
			},
			getTouchAction: function (touchId) {
				return this[touchId]._touchAction;
				// return this[touchId].touchAction;
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
				if (this.primaryTouchId == touchId) this.primaryTouchId = -1;
				return (delete this[touchId]);
			},
			isActive: function (touchId) {
				//console.log("TouchTracker::isActive[" + touchId + "] = " + (touchId in this));
				return (touchId in this);
			},
			identifyTouchTarget: function (touchId, nonCapturedElement) {
				return (this[touchId] && this[touchId]._captureTarget) || nonCapturedElement;
			},
			hasPrimary: function () {
				//console.log("TouchTracker.hasPrimary: " + (this.primaryTouchId != -1));
				return (this.primaryTouchId != -1);
			},
			isPrimary: function (touchId) {
				return (this.primaryTouchId == touchId);
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
				if (!this.isActive(touchId)) throw "InvalidPointerId";
				// 2. pointer must have active buttons, otherwise return
				// 3. register capture on this element.
				this[touchId]._captureTarget = targetElement;
				// 4. Fire a gotpointercapture event at the targetElement
				var syntheticEvent = createPointer(events.gotpointercapture, this.getTouchEvent(touchId), this.getTouch(touchId));
				var target = this.getTouch(touchId).target;
				events.dispatchEvent(target, syntheticEvent);
				return true;
			},
			hasCapture: function (touchId) {
				return !!(this[touchId]._captureTarget);
			},
			releaseCapture: function (touchId, targetElement, implicit) {
				// 1. check if pointerId is active, otw throw DOMException with the name InvalidPointerId.
				if (!this.isActive(touchId)) throw "InvalidPointerId";
				// 2. if pointer capture not set at targetElement, return
				if (!implicit && (this[touchId]._captureTarget !== targetElement)) return false;
				// 3. release capture
				if( this[touchId]._captureTarget ){
					this[touchId]._captureTarget = null;
					// 4. Fire a lostpointercapture event at the targetElement
					var syntheticEvent = createPointer(events.lostpointercapture, TouchTracker.getTouchEvent(touchId), TouchTracker.getTouch(touchId));
					var target = TouchTracker.getTouch(touchId).target;
					events.dispatchEvent(target, syntheticEvent);
				}
				return true;
			},
			implicitReleaseCapture: function (touchId) {
				return this.releaseCapture(touchId, null, true);
			}
		};

		/**
		 * create a synthetic Pointer event based on a touch event
		 * @param pointerType
		 * @param touchEvent
		 * @param touch
		 * @param props
		 * @returns {events.Pointer}
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
			if (TouchTracker.hasCapture(touch.identifier)) {  // spec §10.1
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
			props.pointerId = touch.identifier + 2; // 1 is reserved for mouse event mapping
			props.pointerType = 'touch';
			props.isPrimary = TouchTracker.isPrimary(touch.identifier);
			return new events.Pointer(pointerType, props);
		}

		/**
		 * returns the deeply nested dom element at window coordinates from a touch.
		 *
		 * @param touch
		 * @returns {HTMLElement}
		 */
		function elementFromTouch(touch) {
			return touch.target.ownerDocument.elementFromPoint(touch.pageX, touch.pageY); // careful: different behaviors #15821
		}

		/**
		 * touchstart event handler.
		 * @event
		 * @param e
		 */
		function touchstart(e) {
			//console.log("touchstart::begin");
			var syntheticEvent, touch, touchTarget, touchAction;
			for (var l = e.changedTouches.length, i = 0; i < l; i++) {
				touch = e.changedTouches.item(i);
				touchTarget = null;
				touchAction = events.getTouchAction(touch.target);
				//console.log("touchstart::touchAction=" + touchAction);
				// before doing anything, check if there is already an active primary pointer.
				// If touch action is enabled (touch-action=auto), the current event is related to a new pointer
				// which contribute to a multi touch gesture. Because touch action must be handled by the user agent
				// (TOUCH_ACTION_AUTO), we must absorb this event and cancel the primary pointer.
				if (TouchTracker.hasPrimary() && (touchAction == events.TOUCH_ACTION_AUTO)) {
					// Generates PointerOut > PointerCancel for current primary pointer
					console.log("touchstart::multi touch absorb...");
					var lastNativeEvent = TouchTracker.getPrimaryTouchEvent();
					var lastTouch = TouchTracker.getPrimaryTouch();
					touchTarget = TouchTracker.identifyPrimaryTouchTarget(lastTouch.target);
					syntheticEvent = createPointer(events.pointerout, lastNativeEvent, lastTouch);
					events.dispatchEvent(touchTarget, syntheticEvent);
					syntheticEvent = createPointer(events.pointercancel, lastNativeEvent, lastTouch);
					events.dispatchEvent(touchTarget, syntheticEvent);
					TouchTracker.implicitReleaseCapture(lastTouch.identifier);
					// cancel the primary pointer to avoid duplicate generation of PointerOut > PointerCancel
					TouchTracker.unregister(lastTouch.identifier);
					return;
				}
				if (touchAction != events.TOUCH_ACTION_AUTO) {
					e.preventDefault(); // prevent default action
				}
				// on touchstart, register Pointer *before* firing PointerEvents.
				// set tracker *before* firing synthetic events to make sure Primary touch pointer is defined in case
				// a synthetic event handler decides to set a pointer capture on the element.
				TouchTracker.register(touch.identifier, touchAction);
				TouchTracker.update(touch, e, touch.target);
				// fire PointerOver > PointerDown
				syntheticEvent = createPointer(events.pointerover, e, touch);
				events.dispatchEvent(touch.target, syntheticEvent);
				syntheticEvent = createPointer(events.pointerdown, e, touch);
				events.dispatchEvent(touch.target, syntheticEvent);
			}
			//console.log("touchstart::end");
		}

		/**
		 * touchend event handler.
		 * @event
		 * @param e
		 */
		function touchend(e) {
			//console.log("touchend::begin");
			var syntheticEvent, touch;
			for (var l = e.changedTouches.length, i = 0; i < l; i++) {
				touch = e.changedTouches.item(i);
				if (!TouchTracker.isActive(touch.identifier)) return;
				var touchAction = TouchTracker.getTouchAction(touch.identifier);
				//console.log("touchend::touchAction " + touchAction);
				var lastNativeEventType = TouchTracker.getTouchEvent(touch.identifier).type;
				// elementFromPoint may return null on android when user makes a pinch 2 zoom gesture
				// in that case we use the current touch.target
				// todo: investigate elementFromTouch()
				var elementFromPoint = elementFromTouch(touch) || touch.target;
				var touchTarget = TouchTracker.identifyTouchTarget(touch.identifier, elementFromPoint);
				//
				if (touchAction == events.TOUCH_ACTION_AUTO) {
					switch (lastNativeEventType) {
						case TouchEvents.touchmove:
							// (3) do not map Pointer Event
							break;
						case TouchEvents.touchstart:
							// (5) Fire PointerMove > PointerUp > PointerOut
							syntheticEvent = createPointer(events.pointermove, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							syntheticEvent = createPointer(events.pointerup, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							syntheticEvent = createPointer(events.pointerout, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							// todo: set flag to handle double tap case, in order to prevent the generation of
							// a sequence of event when the second  tap occurs.
							break;
						default:
							// unexpected behavior
							console.log("ATTENTION, touchend event with touch action=auto and lastNativeEventType=["
								+ lastNativeEventType + "]?");
					}
				} else {
					switch (lastNativeEventType) {
						case TouchEvents.touchstart:
							// (6) fire PointerMove > PointerUp > click > PointerOut
							syntheticEvent = createPointer(events.pointermove, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							syntheticEvent = createPointer(events.pointerup, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							// todo: click only from primary pointer and not if multi touch
							if(TouchTracker.isPrimary(touch.identifier)){
								syntheticEvent = events.createSyntheticClick(touch);
								events.dispatchEvent(touchTarget, syntheticEvent);
								// double tap
								if (DoubleTap.isEligible(touchTarget)) {
									syntheticEvent = events.createSyntheticClick(touch, true);
									events.dispatchEvent(touchTarget, syntheticEvent);
									DoubleTap.reset();
								} else {
									DoubleTap.registerClick(touchTarget);
								}
							}
							syntheticEvent = createPointer(events.pointerout, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							break;
						case TouchEvents.touchmove:
							// (4) fire PointerUp > click > PointerOut
							syntheticEvent = createPointer(events.pointerup, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							// fire synthetic click only if pointer release on the origin element
							// (touch.target is the target element of the touchstart)
							if (elementFromPoint === touch.target) {
								// todo: click only from primary pointer and not if multi touch
								if(TouchTracker.isPrimary(touch.identifier)){
									syntheticEvent = events.createSyntheticClick(touch);
									events.dispatchEvent(touchTarget, syntheticEvent);
									// double tap
									if (DoubleTap.isEligible(touchTarget)) {
										syntheticEvent = events.createSyntheticClick(touch, true);
										events.dispatchEvent(touchTarget, syntheticEvent);
										DoubleTap.reset();
									} else {
										DoubleTap.registerClick(touchTarget);
									}
								}
							}
							syntheticEvent = createPointer(events.pointerout, e, touch);
							events.dispatchEvent(touchTarget, syntheticEvent);
							break;
						default:
							// unexpected behavior
							console.log("ATTENTION, touchend event with touch action!=auto and lastNativeEventType=["
								+ lastNativeEventType + "]?");
					}
				}
				TouchTracker.implicitReleaseCapture(touch.identifier);
				TouchTracker.unregister(touch.identifier);
			}
			//console.log("touchend::end");
		}

		/**
		 * touchcancel event handler.
		 * @event
		 * @param e
		 */
		function touchcancel(e) {
			//console.log("touchcancel::begin");
			var syntheticEvent, touch;
			for (var l = e.changedTouches.length, i = 0; i < l; i++) {
				touch = e.changedTouches.item(i);
				if (!TouchTracker.isActive(touch.identifier)) return;
				var touchTarget = TouchTracker.identifyTouchTarget(touch.identifier, elementFromTouch(touch));
				syntheticEvent = createPointer(events.pointercancel, e, touch);
				events.dispatchEvent(touchTarget, syntheticEvent);
				TouchTracker.implicitReleaseCapture(touch.identifier);
				TouchTracker.unregister(touch.identifier);
			}
			//console.log("touchend::end");
		}

		/**
		 * touchmove event handler.
		 * @event
		 * @param e
		 */
		function touchmove(e) {
			//console.log("touchmove::begin");
			var syntheticEvent, touch;
			for (var l = e.changedTouches.length, i = 0; i < l; i++) {
				touch = e.changedTouches.item(i);
				if (!TouchTracker.isActive(touch.identifier)) return;
				var touchAction = TouchTracker.getTouchAction(touch.identifier);
				var lastNativeEventType = TouchTracker.getTouchEvent(touch.identifier).type;
				//
				if (touchAction == events.TOUCH_ACTION_AUTO) {
					switch (lastNativeEventType) {
						case TouchEvents.touchstart:
							// (1) fire PointerOut > PointerCancel
							syntheticEvent = createPointer(events.pointerout, e, touch);
							events.dispatchEvent(touch.target, syntheticEvent);
							syntheticEvent = createPointer(events.pointercancel, e, touch);
							events.dispatchEvent(touch.target, syntheticEvent);
							break;
						case TouchEvents.touchmove:
							// (2) do not fire synthetic event
							break;
						default:
						// events flow already ended (previous touchmove already removed pointer from tracker to
						// prevent PointerEvent to be fired)
					}
					TouchTracker.implicitReleaseCapture(touch.identifier);
					TouchTracker.unregister(touch.identifier);
				} else { // here we always map PointerMove when touch action is set (none/pan-x/pan-y)
					var touchTarget = TouchTracker.identifyTouchTarget(touch.identifier, elementFromTouch(touch));
					var lastElementFromPoint = TouchTracker.getTargetElement(touch.identifier);

					// check if the pointer is moving out from the current target element
					if (touchTarget !== lastElementFromPoint) {
						// PointerOut (on previous elt) > PointerMove (on current elt) >  PointerOver (on current elt)
						syntheticEvent = createPointer(events.pointerout, e, touch, {relatedTarget: touchTarget});
						events.dispatchEvent(lastElementFromPoint, syntheticEvent);

						// generate dojo pointerleave events
						syntheticEvent = createPointer(events.pointerleave, e, touch, {relatedTarget: touchTarget, bubbles: false});
						events.dispatchLeaveEvents(lastElementFromPoint, touchTarget, syntheticEvent);

						syntheticEvent = createPointer(events.pointermove, e, touch);
						events.dispatchEvent(touchTarget, syntheticEvent);

						syntheticEvent = createPointer(events.pointerover, e, touch, {relatedTarget: lastElementFromPoint});
						events.dispatchEvent(touchTarget, syntheticEvent);

						// generate dojo pointerenter events
						syntheticEvent = createPointer(events.pointerenter, e, touch, {relatedTarget: lastElementFromPoint, bubbles: false});
						events.dispatchEnterEvents(touchTarget, lastElementFromPoint, syntheticEvent);
					} else {
						syntheticEvent = createPointer(events.pointermove, e, touch);
						events.dispatchEvent(touchTarget, syntheticEvent);
					}
					TouchTracker.update(touch, e, touchTarget);
					// default actions must be prevented
					e.preventDefault();
				}
			}
			//console.log("touchmove::end");
		}

		/**
		 * @exports pointer/touchHandlers
		 */
		var touchHandlers = {
			/**
			 * register touch events handlers.
			 * @param targetElement
			 */
			registerHandlers: function (targetElement) {
				targetElement = targetElement || window.document;
				events.addEventListener(targetElement, TouchEvents.touchstart, touchstart, true);
				events.addEventListener(targetElement, TouchEvents.touchend, touchend, true);
				events.addEventListener(targetElement, TouchEvents.touchcancel, touchcancel, true);
				events.addEventListener(targetElement, TouchEvents.touchmove, touchmove, true);
			},
			/**
			 * deregister touch events handlers.
			 * @param targetElement
			 */
			deregisterHandlers: function (targetElement) {
				events.removeEventListener(targetElement, TouchEvents.touchstart, touchstart, true);
				events.removeEventListener(targetElement, TouchEvents.touchend, touchend, true);
				events.removeEventListener(targetElement, TouchEvents.touchcancel, touchcancel, true);
				events.removeEventListener(targetElement, TouchEvents.touchmove, touchmove, true);
			},
			/**
			 * Set Pointer capture
			 * @param targetElement DOM element to capture
			 * @param pointerId Id of the Pointer
			 */
			setPointerCapture: function (targetElement, pointerId) {
				return TouchTracker.setCapture(pointerId - 2, targetElement);
			},
			/**
			 * Release Pointer capture
			 * @param targetElement DOM element to release
			 * @param pointerId Id of the Pointer
			 */
			releasePointerCapture: function (targetElement, pointerId) {
				return TouchTracker.releaseCapture(pointerId - 2, targetElement, false);
			}
		};

		return touchHandlers;
	});
//EOF