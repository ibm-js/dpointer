/**
 * Pointer Events shim
 */
define([
	"./handlers/utils",
	"./handlers/touch",
	"./handlers/mouse",
	"./handlers/mspointer"
], function(utils, touch, mouse, mspointer){
	"use strict";

	var pointerEvents = {_targetElement: null},
		feature = {
			//todo: should use has() module instead and
			//consider loading touch and mspointer modules conditionally.
			touch: ("ontouchstart" in document),
			pointer: (!!window.navigator.pointerEnabled),
			mspointer: (!!window.navigator.msPointerEnabled),
			chrome: /chrome/i.test(navigator.userAgent),
			mobile: /(mobile)|(android)/i.test(navigator.userAgent)
		};

	/**
	 * Enable Pointer events. Register native event handlers. Importing this module automatically register native
	 * event handlers on window.document, unless you specify a target element.
	 *
	 * @param targetElement DOM element on which to attach handlers.
	 * @default window.document
	 */
	pointerEvents.enable = function(targetElement){
		targetElement = targetElement || window.document;
		if(this._targetElement){
			return;// already initialized
		}
		if(feature.pointer){
			//todo: test and validate with IE11 RTM
			//window.navigator.pointerEnabled not yet supported...
			if(feature.mspointer){
				mspointer.registerHandlers(targetElement);//...fallback to prefixed MSPointer events.
			}else{
				mouse.registerHandlers(targetElement);//...fallback to mouse events.
			}
		}else{
			if(feature.mspointer){
				mspointer.registerHandlers(targetElement);
			}else{
				if(feature.touch){
					if(!feature.mobile){
						mouse.registerHandlers(targetElement);
						if(feature.chrome){
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
	pointerEvents.disable = function(){
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
	 * @param actionType touch action type: "auto", "none", "pan-x" or "pan-y"
	 */
	pointerEvents.setTouchAction = function(targetElement, actionType){
		targetElement.setAttribute(utils.TouchAction.ATTR_NAME, actionType);
	};

	/**
	 * Set pointer capture on a DOM element.
	 *
	 * @param targetElement DOM element
	 * @param pointerId Pointer ID
	 */
	pointerEvents.setPointerCapture = function(targetElement, pointerId){
		// todo: Internet Explorer automatically set pointer capture on form controls when touch-action is none
		// todo: manage a list of element type to apply pointer capture automatically when touch-action=none is set??
		if(!this._targetElement){
			return false;// not initialized
		}
		if(feature.pointer){
			return targetElement.setPointerCapture(pointerId);// use native Pointer Events method
		}else{
			if(feature.mspointer){
				return targetElement.msSetPointerCapture(pointerId);// use native Pointer Events method
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
	pointerEvents.releasePointerCapture = function(targetElement, pointerId){
		if(!this._targetElement){
			return false;
		}
		if(feature.pointer){
			return targetElement.releasePointerCapture(pointerId);
		}else{
			if(feature.mspointer){
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
	 * @param styleName should be touch-action or -ms-touch-action
	 */
	function insertTouchActionCSSRule(styleName){
		var styleElement = document.createElement('style'),
			attributeName = utils.TouchAction.ATTR_NAME;
		styleElement.textContent = '[' + attributeName + '="none"]  { ' + styleName + ': none; }' +
			'[' + attributeName + '="auto"]  { ' + styleName + ': auto; }' +
			'[' + attributeName + '="pan-x"] { ' + styleName + ': pan-x; }' +
			'[' + attributeName + '="pan-y"] { ' + styleName + ': pan-y; }' +
			'[' + attributeName + '="pan-x pan-y"],[' + styleName + '="pan-y pan-x"] ' +
			'{ ' + styleName + ': pan-x pan-y; }';
		document.head.insertBefore(styleElement, document.head.firstChild);
	}

	// CSS rule when user agent implements W3C Pointer Events or when a polyfill is in place.
	if(feature.pointer){
		insertTouchActionCSSRule("touch-action");
	}

	// CSS rule for IE10 and IE11 preview
	if(feature.mspointer){
		insertTouchActionCSSRule("-ms-touch-action");
	}

	// start listening to native events
	pointerEvents.enable();

	// expose event names
	pointerEvents.events = utils.events;

	return pointerEvents;
});