var tracker = {};
tracker.trackCustomEvents = true;
tracker.trackMSPointerEvents = false;
tracker.trackMouseEvents = false;
tracker.trackTouchEvents = false;

(function () {
	//"use strict"; IE10 doesn't allow [cell.style = "text-align:right;"] when strict mode in enforced
	var lastEventTS = 0;
	var events = [
		/* mouse events */
		// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-eventgroupings-mouseevents
		'click',
		'mousedown',
		'mouseup',
		'mouseover',
		'mousemove',
		'mouseout',
//		'mouseenter',
//		'mouseleave',
		// https://developer.mozilla.org/en-US/docs/Web/Reference/Events/contextmenu
		'contextmenu',
		'dblclick',
		/* touch events */
		'touchstart',
		'touchmove',
		'touchend',
		'touchcancel',
		/* MS pointer events */
		'MSPointerDown',
		'MSPointerMove',
		'MSPointerUp',
		'MSPointerOut',
		'MSPointerOver',
		'MSPointerCancel',
//		'MSPointerEnter',
//		'MSPointerLeave',
		'MSGotPointerCapture',
		'MSLostPointerCapture',
		/* dojo pointer events */
		'dojoPointerDown',
		'dojoPointerMove',
		'dojoPointerUp',
		'dojoPointerOut',
		'dojoPointerOver',
		'dojoPointerCancel',
		'dojoGotPointerCapture',
		'dojoLostPointerCapture'
	];
	var htmlEvents = [
		/* HTML events */
		// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-eventgroupings-htmlevents
		'load',
		'unload',
		'abort',
		'error',
		'select',
		'change',
		'submit',
		'reset',
		'focus',
		'blur',
		'resize',
		'scroll'
	];
	var _tableLogElt;
	var _trackerAreaElt = null;
	var _listenEvents = true;
	var _preventDefaultElements = []; // [ [elementId, status], [elementId, status], ... ]
	var _minCell2Display = 12;
	var _maxRow = 50;

	/**
	 * Delay between 2 calls in ms.
	 */
	function getDelay() {
		var time = 0;
		if (lastEventTS != 0) {
			time = ((new Date()).getTime()) - lastEventTS;
		}
		lastEventTS = (new Date()).getTime();
		return time;
	}

	function setTableLogId(elementId /* String */) {
		var htmlElt = document.getElementById(elementId);
		if (!htmlElt) alert("Unable to find element named [" + elementId + "]");
		_tableLogElt = htmlElt;
	}

	function setTrackerAreaId(elementId /* String */) {
		var htmlElt = document.getElementById(elementId);
		if (!htmlElt) alert("Unable to find element named [" + elementId + "]");
		_trackerAreaElt = htmlElt;
	}

	function preventDefaultOnElement(elementId /* String */, enableIt /* Boolean */) {
		log("=> Set prevent default", elementId, enableIt);
		var htmlElt = document.getElementById(elementId);
		if (!htmlElt) alert("Unable to find element named [" + elementId + "]");
		_preventDefaultElements[elementId] = enableIt;
	}

	function overflowOnElement(elementId /* String */, enableIt /* Boolean */) {
		log("=> Set overflow", elementId, enableIt);
		var htmlElt = document.getElementById(elementId);
		if (!htmlElt) alert("Unable to find element named [" + elementId + "]");
		var saveDisplay = htmlElt.style.display; // trick to force overflow refresh
		htmlElt.style.display = "none";
		htmlElt.style.overflow = (enableIt ? "auto" : "hidden");
		htmlElt.style.display = saveDisplay;
	}

	function resizeLogTable() {
		var ctrlBarElt = document.getElementById("ctrlBar");
		var eventLogElt = document.getElementById("eventlog");
		document.getElementById("logscroll").style.height = (eventLogElt.offsetHeight - ctrlBarElt.offsetHeight) + "px";
	}

	function eventListener(event){
		var type = event.type;
		var touch, l, i;

		if (!tracker.trackMouseEvents && type.match("^mouse")) return true;
		if (!tracker.trackCustomEvents && type.match("^dojo")) return true;
		if (!tracker.trackMSPointerEvents && type.match("^MS")) return true;
		if (!tracker.trackTouchEvents && type.match("^touch")) {
			if (type == "touchstart" || type == "touchmove") {
				if (_preventDefaultElements[event.target.id]) event.preventDefault();
			}
			return true;
		}

		switch (type) {
			case "touchstart":
				if (_preventDefaultElements[event.target.id]) event.preventDefault();
			case "touchend":
			case "touchcancel":
				for (l = event.changedTouches.length, i = 0; i < l; i++) {
					touch = event.changedTouches.item(i);
					log(touch.target.id, type,
						"clientX:" + touch.clientX,
						"clientY:" + touch.clientY,
						"Bubble:" + (event.bubbles),
						"id:" + touch.identifier);
				}
				break;
			case "touchmove":
				if (_preventDefaultElements[event.target.id]) event.preventDefault();
				for (l = event.changedTouches.length, i = 0; i < l; i++) {
					touch = event.changedTouches.item(i);
					log(touch.target.id, type,
						"clientX:" + touch.clientX,
						"clientY:" + touch.clientY,
						"Bubble:" + (event.bubbles),
						"id:" + touch.identifier
					);
				}
				break;
			case "mousedown":
			case "mousemove":
			case "mouseup":
			case "mouseover":
			case "mouseout":
			case "mouseenter":
			case "mouseleave":
			case "contextmenu":
			case "click":
			case "dblclick":
				if( type == "click" || type == "dblclick"){
					type = type + "(" + (event.isTrusted?'n':'s') + ")"; // n for native event, s for synthetic event
				}
				log(event.target.id, type,
					"clientX:" + event.clientX,
					"clientY:" + event.clientY,
					"Bubble:" + (event.bubbles),
					"current:" + (event.currentTarget && event.currentTarget.id),
					"related:" + (event.relatedTarget && event.relatedTarget.id || ''),
					"",
					"",
					"btn:" + (event.button),
					"btns:" + ((event.buttons!==undefined)?event.buttons:"n/a"),
					"which:" + ((event.which!==undefined)?event.which:"n/a")
				);
				break;
			case "MSPointerDown":
			case "MSPointerMove":
			case "MSPointerUp":
			case "MSPointerOut":
			case "MSPointerOver":
			case "MSPointerCancel":
			case "MSPointerEnter":
			case "MSPointerLeave":
			case "MSGotPointerCapture":
			case "MSLostPointerCapture":
				log(event.target.id, type,
					"clientX:" + event.clientX,
					"clientY:" + event.clientY,
					"Bubble:" + (event.bubbles),
					"current:" + (event.currentTarget && event.currentTarget.id),
					"related:" + (event.relatedTarget && event.relatedTarget.id || ''),
					"id:" + event.pointerId,
					(event.isPrimary)?"Primary":"",
					"btn:" + (event.button),
					"btns:" + ((event.buttons!==undefined)?event.buttons:"n/a"),
					"which:" + ((event.which!==undefined)?event.which:"n/a")
				);
				break;
			case "dojoPointerDown":
			case "dojoPointerMove":
			case "dojoPointerUp":
			case "dojoPointerOut":
			case "dojoPointerOver":
			case "dojoPointerCancel":
			case "dojoGotPointerCapture":
			case "dojoLostPointerCapture":
				log(event.target.id, type,
					"clientX:" + event.clientX,
					"clientY:" + event.clientY,
					"Bubble:" + (event.bubbles),
					"current:" + (event.currentTarget && event.currentTarget.id),
					"related:" + (event.relatedTarget && event.relatedTarget.id || ''),
					"id:" + event.pointerId,
					(event.isPrimary)?"Primary":"",
					"btn:" + (event.button),
					"btns:" + ((event.buttons!==undefined)?event.buttons:"n/a"),
					"which:" + ((event.which!==undefined)?event.which:"n/a")
				);
				break;
			default:
				log(event.target.id, type,
					"clientX:" + event.clientX,
					"clientY:" + event.clientY,
					"Bubble:" + (event.bubbles));
				break;
		}
		return true;
	}

	function startTracking() {
		resizeLogTable();
		htmlEvents.forEach(function (en) {
			window.addEventListener(en, function (event) {
				var type = event.type;
				switch (type) {
					case 'resize':
						resizeLogTable();
						break;
					default:
				}
			},true);
		});
		if (_listenEvents) {
			events.forEach(function (en) {
				_trackerAreaElt.addEventListener(en, eventListener,true);
			});
		}
	}

	var PointerColor = {
		index: -1,
		// yellow, blue, red, green, white
		colors: ["#FFFF00", "#0000FF", "#FF0000", "#00FF00", "#FFFFFF"],
		get: function (pointerId) {
			return ( (this[pointerId]) || ((this[pointerId]) = this.next()));
		},
		next: function () {
			this.index = ((this.colors.length - this.index) == 1) ? 0 : (this.index + 1);
			return (this.colors[this.index]);
		}
	};

	function log(/* arg: cell(s) value... */) {
		if (_tableLogElt) {
			if( _tableLogElt.rows.length == _maxRow ) _tableLogElt.deleteRow(_maxRow - 1);
			var row = _tableLogElt.insertRow(0);
			var pid = arguments[7];
			if(pid && (pid!="")) {
				row.style.color = PointerColor.get(pid);
				row.style.backgroundColor = "#888888";
			}

			var i, cell, arg;
			cell = row.insertCell(0);
			cell.innerHTML = String(getDelay()) + "ms";
			cell.style = "text-align:right;";
			for (i = arguments.length - 1; i >= 0; i--) {
				arg = arguments[i];
				if( i == 1 && (arg.length > 0) && (arg.indexOf("click") == 0 || arg.indexOf("dblclick") == 0) ){
					row.style.color = "#FF0000";
					cell = row.insertCell(1).innerHTML = "<i>" + arg + "</i>";
				}else{
					cell = row.insertCell(1).innerHTML = arg;
				}
			}
			// fill up to 10 cells (_minCell2Display default)
			for (i = (arguments.length + 1); i < _minCell2Display; i++) {
				(cell = row.insertCell(i)).innerHTML = "";
			}
		} else {
			alert("table element not initialized.");
		}
	}

	function clear() {
		for (var l = _tableLogElt.rows.length; l > 0; l--) {
			_tableLogElt.deleteRow(0);
		}
		lastEventTS = 0;
	}

	function infos() {
		var DOM4SUPPORT = false;
		try{
			(new MouseEvent("mousedown",{}));
			DOM4SUPPORT = true;
		}catch(error){
		}
		try {
			log("", "");
			log("DOM4 MouseEvent",DOM4SUPPORT );
			log("Event.defaultPrevented", document.createEvent("MouseEvents").defaultPrevented !== undefined);
			log("Event.isTrusted", document.createEvent("MouseEvents").isTrusted !== undefined);
			log("Event.buttons", document.createEvent("MouseEvents").buttons !== undefined);
			log("Function.bind", Boolean(Function.bind));
			log("stopImmediatePropagation", Boolean(document.createEvent('MouseEvent').stopImmediatePropagation));
			log("WebKitMutationObserver", Boolean(window.WebKitMutationObserver));
			log("MutationObserver", Boolean(window.MutationObserver));
			log("hasTouchEvents", ("ontouchstart" in document));
			log("msPointerEnabled", Boolean(window.navigator.msPointerEnabled));
			log("pointerEnabled", Boolean(window.navigator.pointerEnabled));
			log("user agent", navigator.userAgent);
			log("", "");
		} catch (err) {
			log(err);
		}
	}

	tracker.setTableLogId = setTableLogId;
	tracker.setTrackerAreaId = setTrackerAreaId;
	tracker.startTracking = startTracking;
	tracker.log = log;
	tracker.clear = clear;
	tracker.infos = infos;
	tracker.preventDefaultOnElement = preventDefaultOnElement;
	tracker.overflowOnElement = overflowOnElement;
})();