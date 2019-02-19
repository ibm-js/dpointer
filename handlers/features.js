/**
 * 
 */
define([
	"requirejs-dplugins/has"
], function (has) {
	if (typeof document !== "undefined") {
		has.add("touch-events", "ontouchstart" in document); // UA supports Touch Events
		has.add("pointer-events", "onpointerdown" in document); // UA supports Pointer Events
		has.add("touch-device", /(mobile)|(android)/i.test(navigator.userAgent)); // mobile device
		has.add("css-touch-action", "touchAction" in document.body.style);// touch-action CSS
		has.add("css-ms-touch-action", "msTouchAction" in document.body.style);// -ms-touch-action CSS
	}
	return has;
});
