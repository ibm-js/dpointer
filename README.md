#PointerEvents
This repository proposes a unified and consistent javascript events API that could be leveraged in Dojo 2.0.
This API aims to abstract touch/pointer/mouse events across devices/OS.

It is based on the Pointer Events specification (http://www.w3.org/TR/pointerevents):
- follow  Pointer Events specification for events types and behavior
- support touch action
- support Pointer capture

It adds features that are out of scope of the current specification. Main features are:
- click (Tap) action normalization
- double click (double Tap) action normalization
- event button/buttons value normalization
- same behavior on pinch to zoom
- ...

Target environments: IE10+, Android 4.1.1+, BB Z10, iOS6+.

## Status
No official release. **Work in progress**

## licensing
This project is distributed by the Dojo Foundation and licensed under the Dojo dual license [BSD/AFLv2 license](http://dojotoolkit.org/license).
All contributions require a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm).

## Dependencies
For the time being, this project can be integrated into any AMD capable javascript application. Eventually it will add more dependencies to Dojo, for more details see: https://bugs.dojotoolkit.org/ticket/17192

## Content
 * pointerEvents.js: module to load to start using Pointers.
 * events.js, mouseHandlers.js, msPointerHandlers.js, touchHandler.js: submodules used by the API, not to be direclty loaded by client applications.
 * tracker: contains a tool to track different types of events and test/validate how events behave in targeted environments.
 * samples: contains sample client applications
 * require: contains requireJS, used only by test and client applications.

## Usage
**Work in progress: see samples**

## credits
* Sebastien Pereira (IBM CCLA)
