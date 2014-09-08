/**
 * 
 */
define([
	"requirejs-dplugins/has"
], function (has) {
	has.add("touch", "ontouchstart" in document); // UA supports Touch Events
	has.add("pointer", "onpointerdown" in document); // UA supports Pointer Events
	has.add("mspointer", "onmspointerdown" in document); // UA supports Pointer Events (IE10+IE11 preview)
	has.add("chrome", /chrome/i.test(navigator.userAgent)); // UA is chrome.
	has.add("mobile", /(mobile)|(android)/i.test(navigator.userAgent)); // mobile device
	return has;
});