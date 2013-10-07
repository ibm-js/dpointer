/**
 * Pointer Events utilities
 */
define([

], function () {
	"use strict";

	var utils = {
		// pointer events names
		events: {
			DOWN: "pointerdown",
			UP: "pointerup",
			CANCEL: "pointercancel",
			MOVE: "pointermove",
			OVER: "pointerover",
			OUT: "pointerout",
			ENTER: "pointerenter",
			LEAVE: "pointerleave",
			GOTCAPTURE: "gotpointercapture",
			LOSTCAPTURE: "lostpointercapture"
		},
		// touch action
		TouchAction: {
			ATTR_NAME: "data-touch-action",
			AUTO: 0,  // 0000
			PAN_X: 1, // 0001
			PAN_Y: 2, // 0010
			NONE: 3   // 0011
		},
		SUPPORT_MOUSE_EVENT_CONSTRUCTOR: false
	};

	// Check if MouseEvent constructor is supported.
	try {
		var event = new MouseEvent('mousedown', {});
		utils.SUPPORT_MOUSE_EVENT_CONSTRUCTOR = true;
	} catch (e) {
	}

	/**
	 * With touch events there is no CSS property touch-action: Touch action
	 * is specified by the value of the HTML attribute data-touch-action.
	 * This function returns the touch action which applies to the element, based on "touch action"
	 * from its ancestors.
	 * To be used only when underlying native events are touch events.
	 *
	 * @param targetNode
	 * @return Number (auto: 0, pan-x:1, pan-y:2, none: 3)
	 */
	utils.getTouchAction = function (targetNode) {
		// touch-action default value: allow default behavior (no prevent default on touch).
		var nodeValue = utils.TouchAction.AUTO;
		// find ancestors with "touch action" and define behavior accordingly.
		do {
			switch (targetNode.getAttribute && targetNode.getAttribute(utils.TouchAction.ATTR_NAME)) {
				case "auto":
					nodeValue = nodeValue | utils.TouchAction.AUTO;
					break;
				case "pan-x":
					nodeValue = nodeValue | utils.TouchAction.PAN_X;
					break;
				case "pan-y":
					nodeValue = nodeValue | utils.TouchAction.PAN_Y;
					break;
				case "none":
					nodeValue = nodeValue | utils.TouchAction.NONE;
					break;
			}
		} while ((nodeValue != utils.TouchAction.NONE) && (targetNode = targetNode.parentNode));
		return nodeValue;
	};

	/**
	 * handler for Click event.
	 *
	 * @param e
	 * @returns {boolean}
	 */
	function clickHandler(e) {
		if (utils.hasTouchEvents()) {
			// (7) Android 4.1.1 generates a click after touchend even when touchstart is prevented.
			// if we receive a native click at an element with touch action disabled we just have to absorb it.
			// (fixed in Android 4.1.2+)
			if (utils.isNativeClickEvent(e) && (utils.getTouchAction(e.target) != utils.TouchAction.AUTO)) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return false;
			}
		}
		return true;
	}

	/**
	 * Pointer Event constructor.
	 *
	 * @param pointerType pointer type
	 * @param props properties
	 * @returns {Event} a  Pointer event
	 * @constructor description
	 */
	utils.Pointer = function (pointerType, props) {
		props = props || {};
		props.bubbles = ('bubbles' in props) ? props.bubbles : true;
		props.cancelable = (props.cancelable) || true;
		// Mouse Event spec
		// http://www.w3.org/TR/2001/WD-DOM-Level-3-Events-20010823/events.html#Events-eventgroupings-mouseevents
		// DOM4 Event: https://dvcs.w3.org/hg/d4e/raw-file/tip/source_respec.htm
		var e;
		if (utils.SUPPORT_MOUSE_EVENT_CONSTRUCTOR) {
			e = new MouseEvent(pointerType, props);
		} else {
			e = document.createEvent('MouseEvents');
			e.initMouseEvent(pointerType,
				(props.bubbles),
				(props.cancelable),
				(props.view) || null,
				(props.detail) || null,
				(props.screenX) || 0,
				(props.screenY) || 0,
				(props.clientX) || 0,
				(props.clientY) || 0,
				(props.ctrlKey) || false,
				(props.altKey) || false,
				(props.shiftKey) || false,
				(props.metaKey) || false,
				(props.button) || 0,
				(props.relatedTarget) || null
			);
		}
		if (!"buttons" in e) {
			Object.defineProperty(e, "buttons", {
				value: (props.buttons || 0),
				enumerable: true, writable: false});
		} else {
			Object.defineProperty(e, 'buttons', {
				get: function () {
					return props.buttons
				},
				enumerable: true});
		}
		// Pointer events spec
		// http://www.w3.org/TR/pointerevents/#pointerevent-interface
		Object.defineProperties(e, {
				pointerId: { value: props.pointerId || 0, enumerable: true},
				width: {value: props.width || 0, enumerable: true},
				height: {value: props.height || 0, enumerable: true    },
				pressure: {value: props.pressure || 0, enumerable: true},
				tiltX: {value: props.tiltX || 0, enumerable: true},
				tiltY: {value: props.tiltY || 0, enumerable: true},
				pointerType: {value: props.pointerType || '', enumerable: true},
				hwTimestamp: {value: props.hwTimestamp || 0, enumerable: true},
				isPrimary: {value: props.isPrimary || false, enumerable: true}
			}
		);
		return e;
	};

	/**
	 * creates a synthetic click event with properties based on another event.
	 *
	 * @param sourceEvent
	 * @param dblClick set to true to generate a dblclick event
	 * @returns {Event}
	 */
	utils.createSyntheticClick = function (sourceEvent, dblClick) {
		var e = document.createEvent('MouseEvents');
		if (e.isTrusted === undefined) { // Android 4.1.1 does not implement isTrusted
			Object.defineProperty(e, "isTrusted", {
					value: false,
					enumerable: true,
					writable: false,
					configurable: false
				}
			);
		}
		e.initMouseEvent((dblClick) ? "dblclick" : "click",
			true, // bubbles
			true, // cancelable
			sourceEvent.view,
			sourceEvent.detail,
			sourceEvent.screenX,
			sourceEvent.screenY,
			sourceEvent.clientX,
			sourceEvent.clientY,
			sourceEvent.ctrlKey,
			sourceEvent.altKey,
			sourceEvent.shiftKey,
			sourceEvent.metaKey,
			0, // touch: always 0
			null
		);
		return e;
	};

	/**
	 * returns true for a native click event, false for a synthetic click event.
	 *
	 * @param e
	 * @returns {boolean|*}
	 */
	utils.isNativeClickEvent = function (e) {
		return (e.isTrusted === undefined || e.isTrusted);
	};

	/**
	 * register click handler.
	 */
	utils.registerClickHandler = function () {
		utils.addEventListener(window.document, "click", clickHandler, true);
	};

	/**
	 * deregister click handler
	 */
	utils.deregisterClickHandler = function () {
		utils.removeEventListener(window.document, "click", clickHandler, true);
	};

	/**
	 * returns the value of MouseEvent.buttons from MouseEvent.which.
	 *
	 * @param whichValue
	 * @returns {*}
	 */
	utils.which2buttons = function (whichValue) {
		switch (whichValue) {
			case 0:
				return 0;
			case 1:
				return 1;
			case 2:
				return 4;
			case 3:
				return 2;
			default:
				return Math.pow(2, (whichValue - 1));
		}
	};

	/**
	 * Registers the event handler eventListener on target element targetElement
	 * for events of type eventName.
	 *
	 * @param targetElement
	 * @param eventName
	 * @param eventListener
	 * @param useCapture
	 */
	utils.addEventListener = function (targetElement, eventName, eventListener, useCapture) {
		targetElement.addEventListener(eventName, eventListener, useCapture);
	};

	/**
	 * Unregister an existing handler.
	 *
	 * @param targetElement
	 * @param eventName
	 * @param eventListener
	 * @param useCapture
	 */
	utils.removeEventListener = function (targetElement, eventName, eventListener, useCapture) {
		targetElement.removeEventListener(eventName, eventListener, useCapture);
	};

	/**
	 * Dispatch event.
	 *
	 * @param targetElement
	 * @param event
	 * @returns {*}
	 */
		// possible optimization:
		// Chrome: use getEventListeners() to dispatch event ONLY if there is a listener for the target event type
		// other: hook HTMLElement.prototype.addEventListener to keep a record of active [element|event type]
	utils.dispatchEvent = function (targetElement, event) {
		if (!targetElement) {
			// handle case when  moving a pointer outside the window (elementFromTouch return null)
			return false;
		}
		if (!(targetElement.dispatchEvent )) throw new Error("dispatchEvent not supported on targetElement");
		return targetElement.dispatchEvent(event);
	};

	/**
	 * Dispatch pointerleave events.
	 *
	 * @param target
	 * @param relatedTarget
	 * @param syntheticEvent
	 */
	utils.dispatchLeaveEvents = function (target, relatedTarget, syntheticEvent) {
		if (target != null && target != relatedTarget && !(target.compareDocumentPosition(relatedTarget) & 16 )) {
			return this.dispatchEvent(target, syntheticEvent) && this.dispatchLeaveEvents(target.parentNode, relatedTarget, syntheticEvent)
		}
		return true;
	};

	/**
	 * Dispatch pointerenter events.
	 *
	 * @param target
	 * @param relatedTarget
	 * @param syntheticEvent
	 */
	utils.dispatchEnterEvents = function (target, relatedTarget, syntheticEvent) {
		if (target != null && target != relatedTarget && !(target.compareDocumentPosition(relatedTarget) & 16)) {
			return this.dispatchEnterEvents(target.parentNode, relatedTarget, syntheticEvent) && this.dispatchEvent(target, syntheticEvent);
		}
		return true;
	};

	/**
	 * Returns true if user agent handles native touch events.
	 */
	utils.hasTouchEvents = function () {
		return ("ontouchstart" in document);
	};

	/**
	 * Returns true if user agent handles  Pointer Events as per W3C specification.
	 */
	utils.hasPointerEnabled = function () {
		return !!window.navigator.pointerEnabled;
	};

	/**
	 * Returns true if user agent handles MSPointer Events.
	 */
	utils.hasMSPointerEnabled = function () {
		return !!window.navigator.msPointerEnabled;
	};

	return utils;
});