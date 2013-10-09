define([
	"./handlers/utils",
	"./handlers/touch",
	"./handlers/mouse",
	"./handlers/mspointer"
], function (utils, touch, mouse, mspointer) {
	"use strict";

	var pointerEvents = {_targetElement: null},
		ua = navigator.userAgent,
		isChrome = /chrome/i.test(ua),
		isMobile = /(mobile)|(android)/i.test(ua);

	/**
	 * Enable Pointer events. Register native event handlers. Importing this module automatically register native
	 * event handlers on window.document, unless you specify a target element.
	 *
	 * @param targetElement DOM element on which to attach handlers.
	 * @default window.document
	 */
	pointerEvents.enable = function (targetElement) {
		targetElement = targetElement || window.document;
		if(this._targetElement) return; // already initialized
		if(utils.hasPointerEnabled()){
			//todo: test and validate with IE11 RTM
			console.log("window.navigator.pointerEnabled not yet supported...");
			if(utils.hasMSPointerEnabled()){
				console.log("...fallback to prefixed MSPointer events.");
				mspointer.registerHandlers(targetElement);
			}else{
				console.log("...fallback to mouse events..");
				mouse.registerHandlers(targetElement);
			}
		}else{
			if(utils.hasMSPointerEnabled()){
				mspointer.registerHandlers(targetElement);
			}else{
				if(utils.hasTouchEvents()){
					if(!isMobile){
						mouse.registerHandlers(targetElement);
						if(isChrome){
							touch.registerHandlers(targetElement);
						}
					}else{
						touch.registerHandlers(targetElement);
					}
				}else{
					mouse.registerHandlers(targetElement);
				}
			}
		}
		utils.registerClickHandler();
		this._targetElement = targetElement;
	};

	/**
	 * Disable Pointer events. Unregister native event handlers.
	 */
	pointerEvents.disable = function () {
		if(this._targetElement){
			touch.deregisterHandlers(this._targetElement);
			mouse.deregisterHandlers(this._targetElement);
			mspointer.deregisterHandlers(this._targetElement);
			utils.deregisterClickHandler();
		}
		this._targetElement = null;
	};

	/**
	 * Set the attribute data-touch-action on the target element.
	 * Supported touch-actions are "auto" (user agent handles touch actions
	 * default behaviors), "none" (disable user agent default behavior), pan-x and pan-y.
	 *
	 * @param targetElement a DOM element
	 * @param actionType touch action type: auto, none, pan-x or pan-y
	 */
	pointerEvents.setTouchAction = function (targetElement, actionType) {
		targetElement.setAttribute(utils.TouchAction.ATTR_NAME, actionType);
	};

	/**
	 * Set pointer capture on a DOM element.
	 *
	 * @param targetElement DOM element
	 * @param pointerId Pointer ID
	 */
	pointerEvents.setPointerCapture = function (targetElement, pointerId) {
		// todo: Internet Explorer automatically set pointer capture on form controls when touch-action is none
		// todo: manage a list of element type to apply pointer capture automatically when touch-action=none is set??
		if(!this._targetElement) return false; // not initialized
		if(utils.hasPointerEnabled()){
			// use native Pointer Events method
			return targetElement.setPointerCapture(pointerId);
		}else{
			if(utils.hasMSPointerEnabled()){
				// use native Pointer Events method
				return targetElement.msSetPointerCapture(pointerId);
			}else{
				if(pointerId == 1){ // mouse always gets ID = 1
					return mouse.setPointerCapture(targetElement);
				}else{
					return touch.setPointerCapture(targetElement, pointerId);
				}
			}
		}
	};

	/**
	 * Unset pointer capture on a DOM element.
	 *
	 * @param targetElement DOM element
	 * @param pointerId Pointer ID
	 */
	pointerEvents.releasePointerCapture = function (targetElement, pointerId) {
		if(!this._targetElement) return false;
		if(utils.hasPointerEnabled()){
			return targetElement.releasePointerCapture(pointerId);
		}else{
			if(utils.hasMSPointerEnabled()){
				return targetElement.msReleasePointerCapture(pointerId);
			}else{
				if(pointerId == 1){
					return mouse.releasePointerCapture(targetElement);
				}else{
					return touch.releasePointerCapture(targetElement, pointerId);
				}
			}
		}
	};

	/**
	 * CSS rule to define touch-action or -ms-touch-action when data-touch-action attribute is set on Elements.
	 *
	 * @param attributeName
	 * @param styleName
	 */
	function insertTouchActionCSSRule(attributeName, styleName) {
		var styleElement = document.createElement('style');
		styleElement.textContent = '[' + attributeName + '="none"]  { ' + styleName + ': none; }' +
			'[' + attributeName + '="auto"]  { ' + styleName + ': auto; }' +
			'[' + attributeName + '="pan-x"] { ' + styleName + ': pan-x; }' +
			'[' + attributeName + '="pan-y"] { ' + styleName + ': pan-y; }' +
			'[' + attributeName + '="pan-x pan-y"],[' + styleName + '="pan-y pan-x"] ' +
			'{ ' + styleName + ': pan-x pan-y; }';
		var head = document.head;
		head.insertBefore(styleElement, head.firstChild);
	}

	// CSS rule when user agent implements W3C Pointer Events or when a polyfill is in place.
	if(utils.hasPointerEnabled()){
		insertTouchActionCSSRule(utils.TouchAction.ATTR_NAME, "touch-action");
	}

	// CSS rule for IE10 and IE11 preview
	if(utils.hasMSPointerEnabled()){
		insertTouchActionCSSRule(utils.TouchAction.ATTR_NAME, "-ms-touch-action");
	}

	// start listening to native events
	pointerEvents.enable();

	// expose event names
	pointerEvents.events = utils.events;

	return pointerEvents;
});