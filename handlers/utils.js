/**
 * Pointer Events utilities
 */
define([

], function(){
	"use strict";

	var utils = {
		events: { // pointer events names
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
		TouchAction: { // touch action
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
		new MouseEvent('mousedown', {});
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
	 * @param targetNode DOM element
	 * @return Number touch action value which applies to the element (auto: 0, pan-x:1, pan-y:2, none: 3)
	 */
	utils.getTouchAction = function(targetNode){
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
	 * Pointer Event constructor.
	 *
	 * @param pointerType pointer event type name ("pointerdown", "pointerup"...)
	 * @param nativeEvent underlying event which contributes to this pointer event.
	 * @param props properties event properties (optional)
	 * @returns {Event} a  Pointer event
	 */
	utils.Pointer = function(pointerType, nativeEvent, props){
		props = props || {};
		props.bubbles = ('bubbles' in props) ? props.bubbles : true;
		props.cancelable = (props.cancelable) || true;
		// Mouse Event spec
		// http://www.w3.org/TR/2001/WD-DOM-Level-3-Events-20010823/events.html#Events-eventgroupings-mouseevents
		// DOM4 Event: https://dvcs.w3.org/hg/d4e/raw-file/tip/source_respec.htm
		var e;
		if(utils.SUPPORT_MOUSE_EVENT_CONSTRUCTOR){
			e = new MouseEvent(pointerType, props);
		}else{
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
		if(!"buttons" in e){
			Object.defineProperty(e, "buttons", {
				value: (props.buttons || 0),
				enumerable: true, writable: false});
		}else{
			Object.defineProperty(e, 'buttons', {
				get: function(){
					return props.buttons
				},
				enumerable: true});
		}
		// Pointer events default values:
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
		var oldStopPropagation = e.stopPropagation, oldPreventDefault = e.preventDefault;
		e.stopPropagation = function(){
			nativeEvent.stopPropagation();
			oldStopPropagation.apply(this);
		};
		e.preventDefault = function(){
			nativeEvent.preventDefault();
			oldPreventDefault.apply(this);
		};
		return e;
	};

	/**
	 * creates a synthetic click event with properties based on another event.
	 *
	 * @param sourceEvent the underlying event which contributes to the creation of this event.
	 * @param dblClick set to true to generate a dblclick event, otherwise a click event is generated
	 * @returns {Event} the event (click or dblclick)
	 */
	utils.createSyntheticClick = function(sourceEvent, dblClick){
		var e = document.createEvent('MouseEvents');
		if(e.isTrusted === undefined){ // Android 4.1.1 does not implement isTrusted
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
			0, // button property (touch: always 0)
			null); // no related target
		return e;
	};

	/**
	 * returns true for a native click event, false for a synthetic click event.
	 *
	 * @param e an event
	 * @returns true if native event, false for synthetic event.
	 */
	utils.isNativeClickEvent = function(e){
		return (e.isTrusted === undefined || e.isTrusted);
	};

	/**
	 * returns the value of MouseEvent.buttons from MouseEvent.which.
	 *
	 * @param whichValue value of a MouseEvent.which property
	 * @returns Number the value MouseEvent.buttons should have
	 */
	utils.which2buttons = function(whichValue){
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
	 * @param targetElement DOM element to attach the event listener
	 * @param eventName the event type name ("mousedown", "touchstart"...)
	 * @param eventListener an event listener function
	 * @param useCapture set to true to set the handler at the event capture phase
	 */
	utils.addEventListener = function(targetElement, eventName, eventListener, useCapture){
		targetElement.addEventListener(eventName, eventListener, useCapture);
	};

	/**
	 * Unregister an existing handler.
	 *
	 * @param targetElement DOM element where the event listener is attached
	 * @param eventName  the event type name ("mousedown", "touchstart"...)
	 * @param eventListener the event listener function to remove
	 * @param useCapture set to true if the handler is set at the event capture phase
	 */
	utils.removeEventListener = function(targetElement, eventName, eventListener, useCapture){
		targetElement.removeEventListener(eventName, eventListener, useCapture);
	};

	/**
	 * Dispatch an event.
	 *
	 * @param targetElement DOM element
	 * @param event event
	 */
		// possible optimization:
		// Chrome: use getEventListeners() to dispatch event ONLY if there is a listener for the target event type
		// other: hook HTMLElement.prototype.addEventListener to keep a record of active [element|event type]
	utils.dispatchEvent = function(targetElement, event){
		if(!targetElement){
			// handle case when  moving a pointer outside the window (elementFromTouch return null)
			return false;
		}
		if(!(targetElement.dispatchEvent )){
			throw new Error("dispatchEvent not supported on targetElement");
		}
		return targetElement.dispatchEvent(event);
	};

	/**
	 * Dispatch pointerleave events.
	 *
	 * @param target DOM element
	 * @param relatedTarget DOM element
	 * @param syntheticEvent the pointerleave event to dispatch
	 */
	utils.dispatchLeaveEvents = function(target, relatedTarget, syntheticEvent){
		if(target != null && relatedTarget != null && target != relatedTarget && !(target.compareDocumentPosition(relatedTarget) & 16 )){
			return this.dispatchEvent(target, syntheticEvent) && this.dispatchLeaveEvents(target.parentNode, relatedTarget, syntheticEvent)
		}
		return true;
	};

	/**
	 * Dispatch pointerenter events.
	 *
	 * @param target DOM element
	 * @param relatedTarget DOM element
	 * @param syntheticEvent the pointerenter event to dispatch
	 */
	utils.dispatchEnterEvents = function(target, relatedTarget, syntheticEvent){
		if(target != null && relatedTarget != null && target != relatedTarget && !(target.compareDocumentPosition(relatedTarget) & 16)){
			return this.dispatchEnterEvents(target.parentNode, relatedTarget, syntheticEvent) && this.dispatchEvent(target, syntheticEvent);
		}
		return true;
	};

	/**
	 * register click handler.
	 */
	utils.registerClickHandler = function(){
		utils.addEventListener(window.document, "click", clickHandler, true);
	};

	/**
	 * deregister click handler
	 */
	utils.deregisterClickHandler = function(){
		utils.removeEventListener(window.document, "click", clickHandler, true);
	};

	/**
	 * handler for Click events.
	 *
	 * @param e click event
	 */
	function clickHandler(e){
		//todo: normalize button/buttons/which values for click/dblclick events
		if('ontouchstart' in document){//todo: should use has() module instead and
			// (7) Android 4.1.1 generates a click after touchend even when touchstart is prevented.
			// if we receive a native click at an element with touch action disabled we just have to absorb it.
			// (fixed in Android 4.1.2+)
			if(utils.isNativeClickEvent(e) && (utils.getTouchAction(e.target) != utils.TouchAction.AUTO)){
				e.preventDefault();
				e.stopImmediatePropagation();
				return false;
			}
		}
		return true;
	}

	return utils;
});