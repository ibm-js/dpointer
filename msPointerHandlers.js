/**
 * -----------------------------------------------------------
 * MS Pointer handlers: native Microsoft pointer events events handlers.
 * MSPointerDown, MSPointerMove, MSPointerUp, MSPointerOut, MSPointerOver,
 * MSPointerCancel, MSGotPointerCapture, MSLostPointerCapture.
 * http://msdn.microsoft.com/en-us/library/windows/apps/hh441233.aspx
 * -----------------------------------------------------------
 */
define([
	"pointer/events"
],
	function (events) {
		"use strict";

		var msPointerEvents = {
			MSPointerDown: "MSPointerDown",
			MSPointerMove:  "MSPointerMove",
			MSPointerUp:  "MSPointerUp",
			MSPointerOut: "MSPointerOut",
			MSPointerOver: "MSPointerOver",
			MSPointerCancel: "MSPointerCancel",
			MSGotPointerCapture: "MSGotPointerCapture",
			MSLostPointerCapture: "MSLostPointerCapture"
		};

		/**= function
		 * create a synthetic pointer from a MS Pointer Event
		 * @param pointerType
		 * @param msPointerEvent
		 * @param props
		 */
		function createPointer(pointerType, msPointerEvent, props) {
			props = props || {};
			// Mouse events properties
			props.bubbles = msPointerEvent.bubbles;
			props.cancelable = msPointerEvent.cancelable;
			props.view = msPointerEvent.view;
			props.detail = msPointerEvent.detail;
			props.screenX = msPointerEvent.screenX;
			props.screenY = msPointerEvent.screenY;
			props.clientX = msPointerEvent.clientX;
			props.clientY = msPointerEvent.clientY;
			props.ctrlKey = msPointerEvent.ctrlKey;
			props.altKey = msPointerEvent.altKey;
			props.shiftKey = msPointerEvent.shiftKey;
			props.metaKey = msPointerEvent.metaKey;
			props.button = msPointerEvent.button;
			props.buttons = msPointerEvent.buttons;
			props.relatedTarget = msPointerEvent.relatedTarget;

			// Pointer Events properties
			props.pointerId = msPointerEvent.pointerId;
			props.width = msPointerEvent.width;
			props.height = msPointerEvent.height;
			props.pressure = msPointerEvent.pressure;
			props.tiltX = msPointerEvent.tiltX;
			props.tiltY = msPointerEvent.tiltY;
			props.pointerType = normalizePointerType(msPointerEvent.pointerType);
			props.hwTimestamp = msPointerEvent.hwTimestamp;
			props.isPrimary = msPointerEvent.isPrimary;

			return new events.Pointer(pointerType, props);
		}

		// http://msdn.microsoft.com/en-us/library/ie/dn304886%28v=vs.85%29.aspx
		function normalizePointerType(pointerType){
			switch(pointerType){
				case 2:
					return "touch";
				case 3:
					return "pen";
				case 4:
					return "mouse";
				default:
					return pointerType;
			}
		}

		/**
		 * MSPointerDown event handler.
		 * @param e
		 */
		function msPointerDown(e) {
			var syntheticEvent = createPointer(events.pointerdown, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}

		/**
		 * MSPointerMove event handler.
		 * @param e
		 */
		function msPointerMove(e) {
			var syntheticEvent = createPointer(events.pointermove, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}

		/**
		 * MSPointerUp event handler.
		 * @param e
		 */
		function msPointerUp(e) {
			var syntheticEvent = createPointer(events.pointerup, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}

		/**
		 * MSPointerOut event handler.
		 * @param e
		 */
		function msPointerOut(e) {
			var syntheticEvent = createPointer(events.pointerout, e);
			events.dispatchEvent(e.target, syntheticEvent);
			// generate dojo pointerleave events
			syntheticEvent = createPointer(events.pointerleave, e, {bubbles: false});
			events.dispatchLeaveEvents(e.target, e.relatedTarget, syntheticEvent);
		}

		/**
		 * MSPointerOver event handler.
		 * @param e
		 */
		function msPointerOver(e) {
			var syntheticEvent = createPointer(events.pointerover, e);
			events.dispatchEvent(e.target, syntheticEvent);
			// generate dojo pointerenter events
			syntheticEvent = createPointer(events.pointerenter, e, {bubbles: false});
			events.dispatchEnterEvents(e.target, e.relatedTarget, syntheticEvent);
		}

		/**
		 * MSPointerCancel event handler.
		 * @param e
		 */
		function msPointerCancel(e) {
			var syntheticEvent = createPointer(events.pointercancel, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}

		/**
		 * MSGotPointerCapture event handler.
		 * @param e
		 */
		function msGotPointerCapture(e) {
			var syntheticEvent = createPointer(events.gotpointercapture, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}

		/**
		 * MSLostPointerCapture event handler.
		 * @param e
		 */
		function msLostPointerCapture(e) {
			var syntheticEvent = createPointer(events.lostpointercapture, e);
			events.dispatchEvent(e.target, syntheticEvent);
		}


		return {
			/**
			 * register MS Pointer events handlers.
			 *
			 * @param targetElement
			 */
			registerHandlers: function (targetElement) {
				targetElement = targetElement || window.document;
				events.addEventListener(targetElement, msPointerEvents.MSPointerDown, msPointerDown, true);
				events.addEventListener(targetElement, msPointerEvents.MSPointerMove, msPointerMove, true);
				events.addEventListener(targetElement, msPointerEvents.MSPointerUp, msPointerUp, true);
				events.addEventListener(targetElement, msPointerEvents.MSPointerOut, msPointerOut, true);
				events.addEventListener(targetElement, msPointerEvents.MSPointerOver, msPointerOver, true);
				events.addEventListener(targetElement, msPointerEvents.MSPointerCancel, msPointerCancel, true);
				events.addEventListener(targetElement, msPointerEvents.MSGotPointerCapture, msGotPointerCapture, true);
				events.addEventListener(targetElement, msPointerEvents.MSLostPointerCapture, msLostPointerCapture, true);
			},
			/**
			 * deregister MSPointer events handlers.
			 * @param targetElement
			 */
			deregisterHandlers: function (targetElement) {
				events.removeEventListener(targetElement, msPointerEvents.MSPointerDown, msPointerDown, true);
				events.removeEventListener(targetElement, msPointerEvents.MSPointerMove, msPointerMove, true);
				events.removeEventListener(targetElement, msPointerEvents.MSPointerUp, msPointerUp, true);
				events.removeEventListener(targetElement, msPointerEvents.MSPointerOut, msPointerOut, true);
				events.removeEventListener(targetElement, msPointerEvents.MSPointerOver, msPointerOver, true);
				events.removeEventListener(targetElement, msPointerEvents.MSPointerCancel, msPointerCancel, true);
				events.removeEventListener(targetElement, msPointerEvents.MSGotPointerCapture, msGotPointerCapture, true);
				events.removeEventListener(targetElement, msPointerEvents.MSLostPointerCapture, msLostPointerCapture, true);
			}
		};
	});
//EOF