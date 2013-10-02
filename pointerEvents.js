define([
	"pointer/events",
	"pointer/touchHandlers",
	"pointer/mouseHandlers",
	"pointer/msPointerHandlers"
],
	function (events, touchHandlers, mouseHandlers, msPointerHandlers) {
		"use strict";
		// todo: Internet Explorer automatically set pointer capture on form controls when touch-action is none
		// todo: manage a list of element type to apply pointer capture automatically when touch-action=none is set??
		/**
		 * Import this module to use Pointer events.
		 *
		 * @exports pointer/pointerEvents
		 **/
		var pointerEvents = {
			/**
			 * DOM Element on which native event handlers are attached.
			 * @private
			 */
			_targetElement: null
		};

		pointerEvents.events = events;

		var ua = navigator.userAgent;
		var isChrome = /chrome/i.test(ua);
		var isMobile = /(mobile)|(android)/i.test(ua);

		/**
		 * Enable Pointer events. Register native event handlers. Importing this module automatically register native
		 * event handlers on window.document.
		 *
		 * @param targetElement DOM element on which to attach handlers.
		 * @default window.document
		 */
		pointerEvents.enable = function (targetElement) {
			targetElement = targetElement || window.document;
			if (this._targetElement) return; // already initialized
			if (events.hasPointerEnabled()) {
				console.log("window.navigator.pointerEnabled not yet supported."); //todo: future
			} else {
				if (events.hasMSPointerEnabled()) {
					console.log("Registering MS Pointer Events handlers...");
					msPointerHandlers.registerHandlers(targetElement);
				} else {
					if (events.hasTouchEvents()) {
						if(!isMobile){
							console.log("Registering mouse events handlers...");
							mouseHandlers.registerHandlers(targetElement);
							if( isChrome ){
								console.log("Registering touch events handlers...");
								touchHandlers.registerHandlers(targetElement);
							}
						} else {
							console.log("Registering touch events handlers...");
							touchHandlers.registerHandlers(targetElement);
						}
					} else {
						console.log("Registering mouse events handlers...");
						mouseHandlers.registerHandlers(targetElement);
					}
				}
			}
			console.log("Registering click event handler...");
			events.registerClickHandler();
			this._targetElement = targetElement;
			console.log("Event registration done.");
		};

		/**
		 * Disable Pointer events. Unregister native event handlers.
		 */
		pointerEvents.disable = function () {
			if (this._targetElement) {
				console.log("unregistering handlers...");
				touchHandlers.deregisterHandlers(this._targetElement);
				mouseHandlers.deregisterHandlers(this._targetElement);
				msPointerHandlers.deregisterHandlers(this._targetElement);
				events.deregisterClickHandler();
				console.log("unregistering handlers...done.");
			}
			this._targetElement = null;
		};

		/**
		 * Set touch-action on a DOM element. Supported touch-actions are "auto" (user agent handles touch actions
		 * default behaviors), "none" (disable user agent default behavior), pan-x and pan-y.
		 *
		 * @param targetElement a DOM element
		 * @param actionType touch action type: auto, none, pan-x or pan-y
		 */
		pointerEvents.setTouchAction = function (targetElement, actionType) {
			if (events.hasPointerEnabled()) {
				targetElement.style["touch-action"] = actionType;
			} else {
				if (events.hasMSPointerEnabled()) {
					targetElement.style["-ms-touch-action"] = actionType;
				} else {
					targetElement.setAttribute(events.TOUCH_ACTION, actionType);
				}
			}
		};

		/**
		 * Set pointer capture on a DOM element.
		 *
		 * @param targetElement DOM element
		 * @param pointerId Pointer ID
		 */
		pointerEvents.setPointerCapture = function (targetElement, pointerId) {
			//console.log("setPointerCapture [pointer:" + pointerId + ", target:" + targetElement.id + "]");
			if (!this._targetElement) return false;
			if (events.hasPointerEnabled()) {
				return targetElement.setPointerCapture(pointerId);
			} else {
				if (events.hasMSPointerEnabled()) {
					return targetElement.msSetPointerCapture(pointerId);
				} else {
					if (pointerId == 1) {
						return mouseHandlers.setPointerCapture(targetElement);
					} else {
						return touchHandlers.setPointerCapture(targetElement, pointerId);
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
			//console.log("releasePointerCapture [pointer:" + pointerId + ", target:" + targetElement.id + "]");
			if (!this._targetElement) return false;
			if (events.hasPointerEnabled()) {
				return targetElement.releasePointerCapture(pointerId);
			} else {
				if (events.hasMSPointerEnabled()) {
					return targetElement.msReleasePointerCapture(pointerId);
				} else {
					if (pointerId == 1) {
						return mouseHandlers.releasePointerCapture(targetElement);
					} else {
						return touchHandlers.releasePointerCapture(targetElement, pointerId);
					}
				}
			}
		};

		/**
		 * convenient function for client applications to map a color with a pointer ID.
		 * simply call PointerColor.get(pointerId) to get a unique color.
		 * @private
		 */
		pointerEvents.PointerColor = {
			index: -1,
			colors: ["#FFFF00", "#0000FF", "#FF0000", "#00FF00", "#FFFFFF"], // yellow, blue, red, green, white
			get: function (pointerId) {
				return ( (this[pointerId]) || ((this[pointerId]) = this.next()));
			},
			next: function () {
				this.index = ((this.colors.length - this.index) == 1) ? 0 : (this.index + 1);
				return (this.colors[this.index]);
			}
		};

		// CSS rule to define touch-action or -ms-touch-action when data-touch-action attribute is set on Elements
		function insertTouchActionCSSRule(attributeName, styleName){
			var styleElement = document.createElement('style');
			styleElement.textContent = 	'[' + attributeName + '="none"]  { ' + styleName + ': none; }' +
				'[' + attributeName + '="auto"]  { ' + styleName + ': auto; }' +
				'[' + attributeName + '="pan-x"] { ' + styleName + ': pan-x; }' +
				'[' + attributeName + '="pan-y"] { ' + styleName + ': pan-y; }' +
				'[' + attributeName + '="pan-x pan-y"],[' + styleName + '="pan-y pan-x"] ' +
					'{ ' + styleName + ': pan-x pan-y; }';
			var head = document.head;
			head.insertBefore(styleElement, head.firstChild);
		}
		if (events.hasPointerEnabled()) {
			insertTouchActionCSSRule(events.TOUCH_ACTION, "touch-action");
		}
		if (events.hasMSPointerEnabled()) {
			insertTouchActionCSSRule(events.TOUCH_ACTION, "-ms-touch-action");
		}

		pointerEvents.enable();

		return pointerEvents;
	});
// EOF