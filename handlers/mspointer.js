define([
	"./utils"
], function (utils) {
	"use strict";
	/**
	 * this module listen to prefixed "ms" pointer events generates corresponding pointer events.
	 *
	 * http://msdn.microsoft.com/en-us/library/windows/apps/hh441233.aspx
	 */
	var msPointerEvents = {
		MSPointerDown: "MSPointerDown",
		MSPointerMove: "MSPointerMove",
		MSPointerUp: "MSPointerUp",
		MSPointerOut: "MSPointerOut",
		MSPointerOver: "MSPointerOver",
		MSPointerCancel: "MSPointerCancel",
		MSGotPointerCapture: "MSGotPointerCapture",
		MSLostPointerCapture: "MSLostPointerCapture"
	};

	/**
	 * create a synthetic pointer from a MS Pointer Event.
	 *
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

		// fix wrong button value on IE10 and IE11 preview
		if ( (props.button == -1) &&  (props.pointerType == "touch")){
			props.buttons = 1;
		}

		return new utils.Pointer(pointerType, props);
	}

	/**
	 * for IE10 and IE11 preview.
	 * http://msdn.microsoft.com/en-us/library/ie/dn304886%28v=vs.85%29.aspx
	 *
	 * @param pointerType
	 * @returns {*}
	 */
	function normalizePointerType(pointerType) {
		switch (pointerType) {
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
	 *
	 * @param e
	 */
	function msPointerDown(e) {
		var syntheticEvent = createPointer(utils.events.DOWN, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	/**
	 * MSPointerMove event handler.
	 *
	 * @param e
	 */
	function msPointerMove(e) {
		var syntheticEvent = createPointer(utils.events.MOVE, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	/**
	 * MSPointerUp event handler.
	 *
	 * @param e
	 */
	function msPointerUp(e) {
		var syntheticEvent = createPointer(utils.events.UP, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	/**
	 * MSPointerOut event handler.
	 *
	 * @param e
	 */
	function msPointerOut(e) {
		var syntheticEvent = createPointer(utils.events.OUT, e);
		utils.dispatchEvent(e.target, syntheticEvent);
		// generate  pointerleave events
		syntheticEvent = createPointer(utils.events.LEAVE, e, {bubbles: false});
		utils.dispatchLeaveEvents(e.target, e.relatedTarget, syntheticEvent);
	}

	/**
	 * MSPointerOver event handler.
	 *
	 * @param e
	 */
	function msPointerOver(e) {
		var syntheticEvent = createPointer(utils.events.OVER, e);
		utils.dispatchEvent(e.target, syntheticEvent);
		// generate  pointerenter events
		syntheticEvent = createPointer(utils.events.ENTER, e, {bubbles: false});
		utils.dispatchEnterEvents(e.target, e.relatedTarget, syntheticEvent);
	}

	/**
	 * MSPointerCancel event handler.
	 * @param e
	 */
	function msPointerCancel(e) {
		var syntheticEvent = createPointer(utils.events.CANCEL, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	/**
	 * MSGotPointerCapture event handler.
	 *
	 * @param e
	 */
	function msGotPointerCapture(e) {
		var syntheticEvent = createPointer(utils.events.GOTCAPTURE, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	/**
	 * MSLostPointerCapture event handler.
	 *
	 * @param e
	 */
	function msLostPointerCapture(e) {
		var syntheticEvent = createPointer(utils.LOSTCAPTURE, e);
		utils.dispatchEvent(e.target, syntheticEvent);
	}

	return {
		/**
		 * register MS Pointer events handlers.
		 *
		 * @param targetElement
		 */
		registerHandlers: function (targetElement) {
			targetElement = targetElement || window.document;
			utils.addEventListener(targetElement, msPointerEvents.MSPointerDown, msPointerDown, true);
			utils.addEventListener(targetElement, msPointerEvents.MSPointerMove, msPointerMove, true);
			utils.addEventListener(targetElement, msPointerEvents.MSPointerUp, msPointerUp, true);
			utils.addEventListener(targetElement, msPointerEvents.MSPointerOut, msPointerOut, true);
			utils.addEventListener(targetElement, msPointerEvents.MSPointerOver, msPointerOver, true);
			utils.addEventListener(targetElement, msPointerEvents.MSPointerCancel, msPointerCancel, true);
			utils.addEventListener(targetElement, msPointerEvents.MSGotPointerCapture, msGotPointerCapture, true);
			utils.addEventListener(targetElement, msPointerEvents.MSLostPointerCapture, msLostPointerCapture, true);
		},

		/**
		 * deregister MSPointer events handlers.
		 *
		 * @param targetElement
		 */
		deregisterHandlers: function (targetElement) {
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerDown, msPointerDown, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerMove, msPointerMove, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerUp, msPointerUp, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerOut, msPointerOut, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerOver, msPointerOver, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSPointerCancel, msPointerCancel, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSGotPointerCapture, msGotPointerCapture, true);
			utils.removeEventListener(targetElement, msPointerEvents.MSLostPointerCapture, msLostPointerCapture, true);
		}
	};
});