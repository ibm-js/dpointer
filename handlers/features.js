/**
 * Feature detection tests.
 */
define([
	"requirejs-dplugins/has"
], function (has) {
	if (typeof document !== "undefined") {
		has.add("touch-events", "ontouchstart" in document); // UA supports Touch Events
		has.add("pointer-events", "onpointerdown" in document); // UA supports Pointer Events

		// Mobile device
		// Special test for iOS 13.1+, to counteract misleading userAgent string.
		var ios13 = /Safari/.test(navigator.userAgent) && "ontouchstart" in document;
		has.add("touch-device", /(mobile)|(android)/i.test(navigator.userAgent) || ios13); // mobile device

		has.add("css-touch-action", "touchAction" in document.createElement("div").style);
	}

	return has;
});
