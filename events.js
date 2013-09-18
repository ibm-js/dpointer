/**
 * dojo pointer events.
 */
define([
],
	function () {
		"use strict";

		/**
		 * @exports pointer/events
		 **/
		var events = {
			/**
			 * Indicates whether the running environment supports DOM4 events
			 * @type boolean
			 */
			DOM4_EVENT_SUPPORT: false
		};
		try {
			// Check if MouseEvent constructor is supported.
			var event = new MouseEvent('mousedown', {});
			events.DOM4_EVENT_SUPPORT = true;
		} catch(e) {
		}

		// type names of pointer events generated
		/** @field Pointer Down event type name */
		events.pointerdown = "dojoPointerDown";
		/** Pointer UP event type name */
		events.pointerup = "dojoPointerUp";
		events.pointercancel = "dojoPointerCancel";
		events.pointermove = "dojoPointerMove";
		events.pointerover = "dojoPointerOver";
		events.pointerout = "dojoPointerOut";
		events.pointerenter = "dojoPointerEnter"; // not implemented
		events.pointerleave = "dojoPointerLeave"; // not implemented
		events.gotpointercapture = "dojoGotPointerCapture";
		events.lostpointercapture = "dojoLostPointerCapture";

		// name and values of DOM element attribute "touch action".
		events.TOUCH_ACTION = "data-touch-action";
		events.TOUCH_ACTION_AUTO = 0;  // 0000
		events.TOUCH_ACTION_PAN_X = 1; // 0001
		events.TOUCH_ACTION_PAN_Y = 2; // 0010
		events.TOUCH_ACTION_NONE = 3;  // 0011

		/**
		 * handler for Click event.
		 * @param e
		 * @returns {boolean}
		 */
		function clickHandler(e) {
			if (events.hasTouchEvents()) {
				// (7) Android 4.1.1 generates a click after touchend even when touchstart is prevented.
				// if we receive a native click at an element with touch action disabled we just have to absorb it.
				// (fixed in Android 4.1.2+)
				if (events.isNativeClickEvent(e) && (events.getTouchAction(e.target) != events.TOUCH_ACTION_AUTO)) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				}
			}
			return true;
		}
		/**
		 * returns the "touch action" which applies to the element, based on "touch action"
		 * from its ancestors.
		 *
		 * @param targetNode
		 * @return Number (auto: 0, pan-x:1, pan-y:2, none: 3)
		 */
		events.getTouchAction = function (targetNode) {
			// touch-action default value: allow default behavior (no prevent default on touch).
			var nodeValue = events.TOUCH_ACTION_AUTO;
			// find ancestors with "touch action" and define behavior accordingly.
			do {
				switch (targetNode.getAttribute && targetNode.getAttribute(events.TOUCH_ACTION)) {
					case "auto":
						nodeValue = nodeValue | events.TOUCH_ACTION_AUTO;
						break;
					case "pan-x":
						nodeValue = nodeValue | events.TOUCH_ACTION_PAN_X;
						break;
					case "pan-y":
						nodeValue = nodeValue | events.TOUCH_ACTION_PAN_Y;
						break;
					case "none":
						nodeValue = nodeValue | events.TOUCH_ACTION_NONE;
						break;
				}
				//console.log("[" + ((targetNode.id) || (targetNode.tagName) || "window") + "] = "
				// + ((targetNode[events.TOUCH_ACTION]) || "auto" )+ " > " + nodeValue);
			} while ((nodeValue != events.TOUCH_ACTION_NONE) && (targetNode = targetNode.parentNode));
			return nodeValue;
		};
		/**
		 * Pointer Event constructor.
		 *
		 * @param pointerType pointer type
		 * @param props properties
		 * @returns {Event} a Dojo Pointer event
		 * @constructor description
		 */
		events.Pointer = function (pointerType, props) {
			props = props || {};
			props.bubbles = (props.bubbles) || ((pointerType != events.pointerenter) && (pointerType != events.pointerleave));
			props.cancelable = (props.cancelable) || true;
			// Mouse Event spec
			// http://www.w3.org/TR/2001/WD-DOM-Level-3-Events-20010823/events.html#Events-eventgroupings-mouseevents
			// DOM4 Event: https://dvcs.w3.org/hg/d4e/raw-file/tip/source_respec.htm
			var e;
			if (!events.DOM4_EVENT_SUPPORT) {
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
			} else {
				e = new MouseEvent(pointerType, props);
			}
			if (! "buttons" in e) {
				Object.defineProperty(e, "buttons", {
					value: (props.buttons || 0),
					enumerable: true, writable: false});
			} else {
				Object.defineProperty(e, 'buttons', {
					get: function(){ return props.buttons },
					enumerable: true});
			}
			// Pointer events spec
			// http://www.w3.org/TR/pointerevents/#pointerevent-interface
			Object.defineProperties(e,
				{
					pointerId: {
						value: props.pointerId || 0,
						enumerable: true
					},
					width: {
						value: props.width || 0,
						enumerable: true
					},
					height: {
						value: props.height || 0,
						enumerable: true
					},
					pressure: {
						value: props.pressure || 0,
						enumerable: true
					},
					tiltX: {
						value: props.tiltX || 0,
						enumerable: true
					},
					tiltY: {
						value: props.tiltY || 0,
						enumerable: true
					},
					pointerType: {
						value: props.pointerType || '',
						enumerable: true
					},
					hwTimestamp: {
						value: props.hwTimestamp || 0,
						enumerable: true
					},
					isPrimary: {
						value: props.isPrimary || false,
						enumerable: true
					}
				}
			);
			return e;
		};
		/**
		 * creates a synthetic click event with properties based on another event.
		 * @param sourceEvent
		 * @param dblClick
		 * @returns {Event}
		 */
		events.createSyntheticClick = function (sourceEvent, dblClick) {
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
			e.initMouseEvent((dblClick)?"dblclick":"click",
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
		 * @param e
		 * @returns {boolean|*}
		 */
		events.isNativeClickEvent = function (e) {
			return (e.isTrusted === undefined || e.isTrusted);
		};
		/**
		 * register click handler.
		 */
		events.registerClickHandler = function () {
			events.addEventListener(window.document, "click", clickHandler, true);
		};
		/**
		 * deregister click handler
		 */
		events.deregisterClickHandler = function () {
			events.removeEventListener(window.document, "click", clickHandler, true);
		};
		/**
		 * returns the value of MouseEvent.buttons from MouseEvent.which.
		 * @param whichValue
		 * @returns {*}
		 */
		events.which2buttons = function (whichValue) {
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
		events.addEventListener = function (targetElement, eventName, eventListener, useCapture) {
			targetElement.addEventListener(eventName, eventListener, useCapture);
		};
		/**
		 * Unregister an existing handler.
		 * @param targetElement
		 * @param eventName
		 * @param eventListener
		 * @param useCapture
		 */
		events.removeEventListener = function (targetElement, eventName, eventListener, useCapture) {
			targetElement.removeEventListener(eventName, eventListener, useCapture);
		};
		/**
		 * Dispatch event.
		 *
		 * @param targetElement
		 * @param event
		 * @returns {*}
		 */
		events.dispatchEvent = function (targetElement, event) {
			if (!targetElement){
				console.log("ERROR> targetElement null or undefined (event: " + event.type + ")");
				return false;
			}
			if (!(targetElement.dispatchEvent )) throw new Error("dispatchEvent not supported on targetElement");
			return targetElement.dispatchEvent(event);
		};
		/**
		 * Returns true if user agent handles native touch events.
		 */
		events.hasTouchEvents =  function () {
			return ("ontouchstart" in document);
		};
		/**
		 * Returns true if user agent handles  Pointer Events as per W3C specification.
		 */
		events.hasPointerEnabled = function () {
			return !!window.navigator.pointerEnabled;
		};
		/**
		 * Returns true if user agent handles MSPointer Events.
		 */
		events.hasMSPointerEnabled = function () {
			return !!window.navigator.msPointerEnabled;
		};

		return events;
	});
//EOF