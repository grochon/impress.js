/**
 * impress.js
 *
 * impress.js is a presentation tool based on the power of CSS3 transforms and transitions
 * in modern browsers and inspired by the idea behind prezi.com.
 *
 *
 * Copyright 2011-2012 Bartek Szopka (@bartaz)
 *
 * Released under the MIT and GPL Licenses.
 *
 * ------------------------------------------------
 *  author:  Bartek Szopka
 *  version: 0.5.3
 *  url:     http://bartaz.github.com/impress.js/
 *  source:  http://github.com/bartaz/impress.js/
 */

/*jshint bitwise:true, curly:true, eqeqeq:true, forin:true, latedef:true, newcap:true,
         noarg:true, noempty:true, undef:true, strict:true, browser:true */

// You are one of those who like to know how thing work inside?
// Let me show you the cogs that make impress.js run...
(function ( document, window ) {
    'use strict';
    
    // HELPER FUNCTIONS
    
    // `pfx` is a function that takes a standard CSS property name as a parameter
    // and returns it's prefixed version valid for current browser it runs in.
    // The code is heavily inspired by Modernizr http://www.modernizr.com/
    var pfx = (function () {
        
        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};
        
        return function ( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {
                
                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');
                
                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }
            
            }
            
            return memory[ prop ];
        };
    
    })();
    
    // `arraify` takes an array-like object and turns it into real Array
    // to make all the Array.prototype goodness available.
    var arrayify = function ( a ) {
        return [].slice.call( a );
    };
    
    // `css` function applies the styles given in `props` object to the element
    // given as `el`. It runs all property names through `pfx` function to make
    // sure proper prefixed version of the property is used.
    var css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = pfx(key);
                if ( pkey !== null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    };
    
    // `toNumber` takes a value given as `numeric` parameter and tries to turn
    // it into a number. If it is not possible it returns 0 (or other value
    // given as `fallback`).
    var toNumber = function (numeric, fallback) {
        return isNaN(numeric) ? (fallback || 0) : Number(numeric);
    };
    
    // `byId` returns element with given `id` - you probably have guessed that ;)
    var byId = function ( id ) {
        return document.getElementById(id);
    };
    
    // `$` returns first element for given CSS `selector` in the `context` of
    // the given element or whole document.
    var $ = function ( selector, context ) {
        context = context || document;
        return context.querySelector(selector);
    };
    
    // `$$` return an array of elements for given CSS `selector` in the `context` of
    // the given element or whole document.
    var $$ = function ( selector, context ) {
        context = context || document;
        return arrayify( context.querySelectorAll(selector) );
    };
    
    // `triggerEvent` builds a custom DOM event with given `eventName` and `detail` data
    // and triggers it on element given as `el`.
    var triggerEvent = function (el, eventName, detail) {
        var event = document.createEvent("CustomEvent");
        event.initCustomEvent(eventName, true, true, detail);
        el.dispatchEvent(event);
    };
    
    // `translate` builds a translate transform string for given data.
    var translate = function ( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };
    
    // `rotate` builds a rotate transform string for given data.
    // By default the rotations are in X Y Z order that can be reverted by passing `true`
    // as second parameter.
    var rotate = function ( r, revert ) {
        var rX = " rotateX(" + r.x + "deg) ",
            rY = " rotateY(" + r.y + "deg) ",
            rZ = " rotateZ(" + r.z + "deg) ";
        
        return revert ? rZ+rY+rX : rX+rY+rZ;
    };
    
    // `scale` builds a scale transform string for given data.
    var scale = function ( s ) {
        return " scale(" + s + ") ";
    };
    
    // `perspective` builds a perspective transform string for given data.
    var perspective = function ( p ) {
        return " perspective(" + p + "px) ";
    };
    
    // `getElementFromHash` returns an element located by id from hash part of
    // window location.
    var getElementFromHash = function () {
        // get id from url # by removing `#` or `#/` from the beginning,
        // so both "fallback" `#slide-id` and "enhanced" `#/slide-id` will work
        return byId( window.location.hash.replace(/^#\/?/,"") );
    };
    
    // `computeWindowScale` counts the scale factor between window size and size
    // defined for the presentation in the config.
    var computeWindowScale = function ( config ) {
        var hScale = window.innerHeight / config.height,
            wScale = window.innerWidth / config.width,
            scale = hScale > wScale ? wScale : hScale;
        
        if (config.maxScale && scale > config.maxScale) {
            scale = config.maxScale;
        }
        
        if (config.minScale && scale < config.minScale) {
            scale = config.minScale;
        }
        
        return scale;
    };
    
    // CHECK SUPPORT
    var body = document.body;
    
    var ua = navigator.userAgent.toLowerCase();
    var impressSupported = 
                          // browser should support CSS 3D transtorms 
                           ( pfx("perspective") !== null ) &&
                           
                          // and `classList` and `dataset` APIs
                           ( body.classList ) &&
                           ( body.dataset ) &&
                           
                          // but some mobile devices need to be blacklisted,
                          // because their CSS 3D support or hardware is not
                          // good enough to run impress.js properly, sorry...
                           ( ua.search(/(iphone)|(ipod)|(android)/) === -1 );
    
    if (!impressSupported) {
        // we can't be sure that `classList` is supported
        body.className += " impress-not-supported ";
    } else {
        body.classList.remove("impress-not-supported");
        body.classList.add("impress-supported");
    }
    
    // GLOBALS AND DEFAULTS
    
    // This is were the root elements of all impress.js instances will be kept.
    // Yes, this means you can have more than one instance on a page, but I'm not
    // sure if it makes any sense in practice ;)
    var roots = {};
    
    // some default config values.
    var defaults = {
        width: 1024,
        height: 768,
        maxScale: 1,
        minScale: 0,
        
        perspective: 1000,
        
        transitionDuration: 1000
    };
    
    // it's just an empty function ... and a useless comment.
    var empty = function () { return false; };
    
    // IMPRESS.JS API
    
    // And that's where interesting things will start to happen.
    // It's the core `impress` function that returns the impress.js API
    // for a presentation based on the element with given id ('impress'
    // by default).
    var impress = window.impress = function ( rootId ) {
        
        // If impress.js is not supported by the browser return a dummy API
        // it may not be a perfect solution but we return early and avoid
        // running code that may use features not implemented in the browser.
        if (!impressSupported) {
            return {
                init: empty,
                goto: empty,
                prev: empty,
                next: empty,
                zoomTo: empty,
                zoomBy: empty,
                panBy: empty
            };
        }
        
        rootId = rootId || "impress";
        
        // if given root is already initialized just return the API
        if (roots["impress-root-" + rootId]) {
            return roots["impress-root-" + rootId];
        }
        
        // data of all presentation steps
        var stepsData = {};
        
        // element of currently active step
        var activeStep = null;
        
        // current state (position, rotation and scale) of the presentation
        var currentState = null;
        
        // array of step elements
        var steps = null;
        
        // configuration options
        var config = null;
        
        // scale factor of the browser window
        var windowScale = null;        
        
        // root presentation elements
        var root = byId( rootId );
        var canvas = document.createElement("div");
        
        var initialized = false;
        
        // STEP EVENTS
        //
        // There are currently two step events triggered by impress.js
        // `impress:stepenter` is triggered when the step is shown on the 
        // screen (the transition from the previous one is finished) and
        // `impress:stepleave` is triggered when the step is left (the
        // transition to next step just starts).
        
        // reference to last entered step
        var lastEntered = null;
        
        // `onStepEnter` is called whenever the step element is entered
        // but the event is triggered only if the step is different than
        // last entered step.
        var onStepEnter = function (step) {
            if (lastEntered !== step) {
                triggerEvent(step, "impress:stepenter");
                lastEntered = step;
            }
        };
        
        // `onStepLeave` is called whenever the step element is left
        // but the event is triggered only if the step is the same as
        // last entered step.
        var onStepLeave = function (step) {
            if (lastEntered === step) {
                triggerEvent(step, "impress:stepleave");
                lastEntered = null;
            }
        };
        
        // `initStep` initializes given step element by reading data from its
        // data attributes and setting correct styles.
        var initStep = function ( el, idx ) {
            var data = el.dataset,
                step = {
                    translate: {
                        x: toNumber(data.x),
                        y: toNumber(data.y),
                        z: toNumber(data.z)
                    },
                    rotate: {
                        x: toNumber(data.rotateX),
                        y: toNumber(data.rotateY),
                        z: toNumber(data.rotateZ || data.rotate)
                    },
                    scale: toNumber(data.scale, 1),
                    el: el
                };
            
            if ( !el.id ) {
                el.id = "step-" + (idx + 1);
            }
            
            stepsData["impress-" + el.id] = step;
            
            css(el, {
                position: "absolute",
                transform: "translate(-50%,-50%)" +
                           translate(step.translate) +
                           rotate(step.rotate) +
                           scale(step.scale),
                transformStyle: "preserve-3d"
            });
        };
        
        // `init` API function that initializes (and runs) the presentation.
        var init = function () {
            if (initialized) { return; }
            
            // First we set up the viewport for mobile devices.
            // For some reason iPad goes nuts when it is not done properly.
            var meta = $("meta[name='viewport']") || document.createElement("meta");
            meta.content = "width=device-width, minimum-scale=1, maximum-scale=1, user-scalable=no";
            if (meta.parentNode !== document.head) {
                meta.name = 'viewport';
                document.head.appendChild(meta);
            }
            
            // initialize configuration object
            var rootData = root.dataset;
            config = {
                width: toNumber( rootData.width, defaults.width ),
                height: toNumber( rootData.height, defaults.height ),
                maxScale: toNumber( rootData.maxScale, defaults.maxScale ),
                minScale: toNumber( rootData.minScale, defaults.minScale ),                
                perspective: toNumber( rootData.perspective, defaults.perspective ),
                transitionDuration: toNumber( rootData.transitionDuration, defaults.transitionDuration )
            };
            
            windowScale = computeWindowScale( config );
            
            // wrap steps with "canvas" element
            arrayify( root.childNodes ).forEach(function ( el ) {
                canvas.appendChild( el );
            });
            root.appendChild(canvas);
            
            // set initial styles
            document.documentElement.style.height = "100%";
            
            css(body, {
                height: "100%",
                overflow: "hidden"
            });
            
            var rootStyles = {
                position: "absolute",
                transformOrigin: "top left",
                transition: "all 0s ease-in-out",
                transformStyle: "preserve-3d"
            };
            
            css(root, rootStyles);
            css(root, {
                top: "50%",
                left: "50%",
                transform: perspective( config.perspective/windowScale ) + scale( windowScale )
            });
            css(canvas, rootStyles);
            
            body.classList.remove("impress-disabled");
            body.classList.add("impress-enabled");
            
            // get and init steps
            steps = $$(".step", root);
            steps.forEach( initStep );
            
            // set a default initial state of the canvas
            currentState = {
                translate: { x: 0, y: 0, z: 0 },
                rotate:    { x: 0, y: 0, z: 0 },
                scale:     1
            };
            
            initialized = true;
            
            triggerEvent(root, "impress:init", { api: roots[ "impress-root-" + rootId ] });
        };
        
        // `getStep` is a helper function that returns a step element defined by parameter.
        // If a number is given, step with index given by the number is returned, if a string
        // is given step element with such id is returned, if DOM element is given it is returned
        // if it is a correct step element.
        var getStep = function ( step ) {
            if (typeof step === "number") {
                step = step < 0 ? steps[ steps.length + step] : steps[ step ];
            } else if (typeof step === "string") {
                step = byId(step);
            }
            return (step && step.id && stepsData["impress-" + step.id]) ? step : null;
        };
        
        // used to reset timeout for changeView callback
        var changeViewTimeout = null;
        
        // change the view to the target position
        var changeView = function ( target, duration, callback ) {

            // Check what type of transition this is.
            //
            // This information is used to alter the transition style:
            // when we are moving and zooming in - we start with move and rotate transition
            // and the scaling is delayed, but when we are moving and zooming out we start
            // with scaling down and move and rotation are delayed. when we are only moving
            // or only zooming, neither are delayed.
            var zoomin = target.scale > currentState.scale;
            var zoom = target.scale !== currentState.scale;
            var move = target.translate.x !== currentState.translate.x 
                        || target.translate.y !== currentState.translate.y 
                        || target.translate.z !== currentState.translate.z
                        || target.rotate.x !== currentState.rotate.x 
                        || target.rotate.y !== currentState.rotate.y 
                        || target.rotate.z !== currentState.rotate.z;
            
            duration = toNumber(duration, config.transitionDuration);
            var delay = (duration / 2);
            
            var targetScale = target.scale * windowScale;
            
            // Now we alter transforms of `root` and `canvas` to trigger transitions.
            //
            // And here is why there are two elements: `root` and `canvas` - they are
            // being animated separately:
            // `root` is used for scaling and `canvas` for translate and rotations.
            // Transitions on them are triggered with different delays (to make
            // visually nice and 'natural' looking transitions), so we need to know
            // that both of them are finished.
            var delayZoom = zoom && move && zoomin;
            css(root, {
                // to keep the perspective look similar for different scales
                // we need to 'scale' the perspective, too
                transform: perspective( config.perspective / targetScale ) + scale( targetScale ),
                transitionDuration: duration + "ms",
                transitionDelay: (delayZoom ? delay : 0) + "ms"
            });

            var delayMove = zoom && move && !zoomin;
            css(canvas, {
                transform: rotate(target.rotate, true) + translate(target.translate),
                transitionDuration: duration + "ms",
                transitionDelay: (delayMove ? delay : 0) + "ms"
            });
            
            if (callback) {
                // Here is a tricky part...
                //
                // If there is no change in scale or no change in rotation and translation, it means there was actually
                // no delay - because there was no transition on `root` or `canvas` elements.
                // We want to trigger the callback in the correct moment, so here we check if delay should 
                // be taken into account.
                var callbackDelay = duration + (delayZoom || delayMove ? delay : 0);
                
                // And here is where we trigger the callback.
                // We simply set up a timeout to fire it taking transition duration (and possible delay) into account.
                //
                // I really wanted to make it in more elegant way. The `transitionend` event seemed to be the best way
                // to do it, but the fact that I'm using transitions on two separate elements and that the `transitionend`
                // event is only triggered when there was a transition (change in the values) caused some bugs and 
                // made the code really complicated, cause I had to handle all the conditions separately. And it still
                // needed a `setTimeout` fallback for the situations when there is no transition at all.
                // So I decided that I'd rather make the code simpler than use shiny new `transitionend`.
                //
                // If you want learn something interesting and see how it was done with `transitionend` go back to
                // version 0.5.2 of impress.js: http://github.com/bartaz/impress.js/blob/0.5.2/js/impress.js
                window.clearTimeout(changeViewTimeout);
                changeViewTimeout = window.setTimeout(callback, callbackDelay);
            }
            
            // store current state
            currentState = target;
        };

        // `goto` API function that moves to step given with `el` parameter (by index, id or element),
        // with a transition `duration` optionally given as second parameter.
        var goto = function ( el, duration ) {
            
            if ( !initialized || !(el = getStep(el)) ) {
                // presentation not initialized or given element is not a step
                return false;
            }
            
            // Sometimes it's possible to trigger focus on first link with some keyboard action.
            // Browser in such a case tries to scroll the page to make this element visible
            // (even that body overflow is set to hidden) and it breaks our careful positioning.
            //
            // So, as a lousy (and lazy) workaround we will make the page scroll back to the top
            // whenever slide is selected
            //
            // If you are reading this and know any better way to handle it, I'll be glad to hear about it!
            window.scrollTo(0, 0);
            
            var step = stepsData["impress-" + el.id];
            
            if ( activeStep ) {
                activeStep.classList.remove("active");
                body.classList.remove("impress-on-" + activeStep.id);
            }
            el.classList.add("active");
            
            body.classList.add("impress-on-" + el.id);
            
            // compute target state of the canvas based on given step
            var target = {
                rotate: {
                    x: -step.rotate.x,
                    y: -step.rotate.y,
                    z: -step.rotate.z
                },
                translate: {
                    x: -step.translate.x,
                    y: -step.translate.y,
                    z: -step.translate.z
                },
                scale: 1 / step.scale
            };
            
            // if the same step is re-selected, force computing window scaling,
            // because it is likely to be caused by window resize
            if (el === activeStep) {
                windowScale = computeWindowScale(config);
            }
            
            // trigger leave of currently active element (if it's not the same step again)
            if (activeStep && activeStep !== el) {
                onStepLeave(activeStep);
            }
            
            // transition the view and fire the `step:enter` event when done
            changeView(target, duration, function() {
                onStepEnter(activeStep);
            });
            
            // store active step
            activeStep = el;
            
            return el;
        };
        
        // `prev` API function goes to previous step (in document order)
        var prev = function () {
            var prev = steps.indexOf( activeStep ) - 1;
            prev = prev >= 0 ? steps[ prev ] : steps[ steps.length-1 ];
            
            return goto(prev);
        };
        
        // `next` API function goes to next step (in document order)
        var next = function () {
            var next = steps.indexOf( activeStep ) + 1;
            next = next < steps.length ? steps[ next ] : steps[ 0 ];
            
            return goto(next);
        };
        
        // `zoomTo` API function changes current zoom level to a specific percentage
        var zoomTo = function ( pct, duration ) {
            var target = {
                    rotate: {
                        x: currentState.rotate.x,
                        y: currentState.rotate.y,
                        z: currentState.rotate.z
                    },
                    translate: {
                        x: currentState.translate.x,
                        y: currentState.translate.y,
                        z: currentState.translate.z
                    },
                    scale: pct
                };
            
            changeView(target, duration);
        };
        
        // `zoomBy` API function change current zoom level by a specified factor
        var zoomBy = function ( factor, duration ) {
            zoomTo(currentState.scale * factor, duration);
        };
        
        var degreesToRadians = function(degrees) {
            return degrees * (Math.PI / 180);
        }
        
        var cos = function(degrees) {
            return Math.cos(degreesToRadians(degrees));
        }
        
        var sin = function(degrees) {
            return Math.sin(degreesToRadians(degrees));
        }
        
        // `panBy` API function change current pan by a specified amount in either x or y direction or both, within a given duration
        // the passed in xPanAmount and yPanAmount will be the exact pixel amount as measured or perceived by the user, for example
        // if the xPanAmount = 100 that means move the whole presentation 100px to the right as measured with the ruler in your debugger
        var panBy = function (xPanAmount, yPanAmount, duration ) {
            
            //extracted the formula by multiplying the following 3d (4x4) rotation and translation matrices:
            //  R_x(-angleX) * R_y(-angleY) * R_z(-angleZ) * T(dx, dy, 0) * R_z(angleZ) * R_y(angleY) * R_x(angleX) = 
            //     [1,  0,  0,  cox(angleY) * (dx * cos(angleZ) + dy * sin(angleZ))                                                                        ]
            // =   [0,  1,  0,  sin(angleX) * sin(angleY) * (dx * cos(angleZ) + dy * sin(angleZ)) - cos(angleX) * (dx * sin(angleZ) - dy * cos(angleZ))    ]
            //     [0,  0,  1,  cos(angleX) * sin(angleY) * (dx * cos(angleZ) + dy * sin(angleZ)) + sin(angleX) * (dx * sin(angleZ) - dy * cos(angleZ))    ]
            //
            // Math is wonderful, isn't it?
            
            var dx = xPanAmount / (currentState.scale * windowScale),
                dy = yPanAmount / (currentState.scale * windowScale),
                sinX = sin(currentState.rotate.x),
                sinY = sin(currentState.rotate.y),
                sinZ = sin(currentState.rotate.z),
                cosX = cos(currentState.rotate.x),
                cosY = cos(currentState.rotate.y),
                cosZ = cos(currentState.rotate.z),
                dxCosZ = dx * cosZ,
                dySinZ = dy * sinZ,
                dxSinZ = dx * sinZ,
                dyCosZ = dy * cosZ,
                dxCosZ_plus_dySinZ = dxCosZ + dySinZ,
                dxSinZ_minus_dyCosZ = dxSinZ - dyCosZ,
                translateX = cosY * dxCosZ_plus_dySinZ,
                translateY = sinX * sinY * dxCosZ_plus_dySinZ - cosX * dxSinZ_minus_dyCosZ,
                translateZ = cosX * sinY * dxCosZ_plus_dySinZ + sinX * dxSinZ_minus_dyCosZ;
            var target = {
                    rotate: {
                        x: currentState.rotate.x,
                        y: currentState.rotate.y,
                        z: currentState.rotate.z
                    },
                    translate: {
                        x: currentState.translate.x + translateX,
                        y: currentState.translate.y + translateY,
                        z: currentState.translate.z + translateZ
                    },
                    scale: currentState.scale
                };
           changeView(target, duration);
        }
        
        // Adding some useful classes to step elements.
        //
        // All the steps that have not been shown yet are given `future` class.
        // When the step is entered the `future` class is removed and the `present`
        // class is given. When the step is left `present` class is replaced with
        // `past` class.
        //
        // So every step element is always in one of three possible states:
        // `future`, `present` and `past`.
        //
        // There classes can be used in CSS to style different types of steps.
        // For example the `present` class can be used to trigger some custom
        // animations when step is shown.
        root.addEventListener("impress:init", function(){
            // STEP CLASSES
            steps.forEach(function (step) {
                step.classList.add("future");
            });
            
            root.addEventListener("impress:stepenter", function (event) {
                event.target.classList.remove("past");
                event.target.classList.remove("future");
                event.target.classList.add("present");
            }, false);
            
            root.addEventListener("impress:stepleave", function (event) {
                event.target.classList.remove("present");
                event.target.classList.add("past");
            }, false);
            
        }, false);
        
        // Adding hash change support.
        root.addEventListener("impress:init", function(){
            
            // last hash detected
            var lastHash = "";
            
            // `#/step-id` is used instead of `#step-id` to prevent default browser
            // scrolling to element in hash.
            //
            // And it has to be set after animation finishes, because in Chrome it
            // makes transtion laggy.
            // BUG: http://code.google.com/p/chromium/issues/detail?id=62820
            root.addEventListener("impress:stepenter", function (event) {
                window.location.hash = lastHash = "#/" + event.target.id;
            }, false);
            
            window.addEventListener("hashchange", function () {
                // When the step is entered hash in the location is updated
                // (just few lines above from here), so the hash change is 
                // triggered and we would call `goto` again on the same element.
                //
                // To avoid this we store last entered hash and compare.
                if (window.location.hash !== lastHash) {
                    goto( getElementFromHash() );
                }
            }, false);
            
            // START 
            // by selecting step defined in url or first step of the presentation
            goto(getElementFromHash() || steps[0], 0);
        }, false);
        
        body.classList.add("impress-disabled");
        
        // store and return API for given impress.js root element
        return (roots[ "impress-root-" + rootId ] = {
            init: init,
            goto: goto,
            next: next,
            prev: prev,
            zoomTo: zoomTo,
            zoomBy: zoomBy,
            panBy: panBy
        });

    };
    
    // flag that can be used in JS to check if browser have passed the support test
    impress.supported = impressSupported;
    
})(document, window);

// NAVIGATION EVENTS

// As you can see this part is separate from the impress.js core code.
// It's because these navigation actions only need what impress.js provides with
// its simple API.
//
// In future I think about moving it to make them optional, move to separate files
// and treat more like a 'plugins'.
(function ( document, window ) {
    'use strict';
    
    // configuration values
    var config = {
        kbdZoomAmount: 1.5,
        kbdActionDuration: 250,
        wheelZoomAmount: 1.1,
        kbdPanningFactor: 100
    };
    
    // throttling function calls, by Remy Sharp
    // http://remysharp.com/2010/07/21/throttling-function-calls/
    var throttle = function (fn, delay) {
        var timer = null;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, delay);
        };
    };
    
    var mousePan = function() {
        var captureMouseCoord = false;
        var mouseCoord = {previous: {}, current: {}};
        var panTimer;
        var pauseEvent = function(event) {
            if(event.stopPropagation) event.stopPropagation();
            if(event.preventDefault) event.preventDefault();
            event.cancelBubble=true;
            event.returnValue=false;
            return false;
        }
        
        return {
            onMouseMove: function( event ) {
                if(captureMouseCoord) {
                    mouseCoord.current.x = event.clientX;
                    mouseCoord.current.y = event.clientY;
                }
                pauseEvent(event);
            },
            onMouseDown: function( event, api) {
                mouseCoord.current.x = event.clientX;
                mouseCoord.current.y = event.clientY;
                mouseCoord.previous.x = event.clientX;
                mouseCoord.previous.y = event.clientY;
                captureMouseCoord = true;
                var panFn = function() {
                    //done to prevent the race condition of updating current while reading current
                    var currX = mouseCoord.current.x;
                    var currY = mouseCoord.current.y;
                    if(currX !== mouseCoord.previous.x || currY !== mouseCoord.previous.y) {
                        api.panBy(currX - mouseCoord.previous.x, currY - mouseCoord.previous.y, 0);
                        mouseCoord.previous.x = currX;
                        mouseCoord.previous.y = currY;
                    }
                    panTimer = setTimeout(panFn, 30);
                }
                panTimer = setTimeout(panFn, 50);
                pauseEvent(event);
            },
            onMouseUp: function( event ) {
                clearTimeout(panTimer);
                captureMouseCoord = false;
                pauseEvent(event);
            }
        };
    }();
    
    // wait for impress.js to be initialized
    document.addEventListener("impress:init", function (event) {
        // Getting API from event data.
        // So you don't event need to know what is the id of the root element
        // or anything. `impress:init` event data gives you everything you 
        // need to control the presentation that was just initialized.
        var api = event.detail.api;
        
        // KEYBOARD NAVIGATION HANDLERS
        
        // Prevent default keydown action when one of supported key is pressed.
        document.addEventListener("keydown", function ( event ) {
             if ( event.keyCode === 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) || event.keyCode === 187 || event.keyCode === 189 ) {
                if(event.ctrlKey && (event.keyCode >= 37 && event.keyCode <= 40)) {
                    switch(event.keyCode) {
                        case 37: //left
                                api.panBy(config.kbdPanningFactor, 0, config.kbdActionDuration);
                                break;
                        case 38: //up
                                api.panBy(0, config.kbdPanningFactor, config.kbdActionDuration);
                                break;
                        case 39: //right
                                api.panBy(-config.kbdPanningFactor, 0, config.kbdActionDuration);
                                break;
                        case 40: //down
                                api.panBy(0, -config.kbdPanningFactor, config.kbdActionDuration);
                                break;
                    }
                }
                
                event.preventDefault();
            }
        }, false);
        
        // Trigger impress action (next or prev) on keyup.
        
        // Supported keys are:
        // [space] - quite common in presentation software to move forward
        // [up] [right] / [down] [left] - again common and natural addition,
        // [pgdown] / [pgup] - often triggered by remote controllers,
        // [tab] - this one is quite controversial, but the reason it ended up on
        //   this list is quite an interesting story... Remember that strange part
        //   in the impress.js code where window is scrolled to 0,0 on every presentation
        //   step, because sometimes browser scrolls viewport because of the focused element?
        //   Well, the [tab] key by default navigates around focusable elements, so clicking
        //   it very often caused scrolling to focused element and breaking impress.js
        //   positioning. I didn't want to just prevent this default action, so I used [tab]
        //   as another way to moving to next step... And yes, I know that for the sake of
        //   consistency I should add [shift+tab] as opposite action...
        document.addEventListener("keyup", function ( event ) {
            if ( event.keyCode === 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (!event.ctrlKey && event.keyCode >= 37 && event.keyCode <= 40) || event.keyCode === 187 || event.keyCode === 189 ) {
                switch( event.keyCode ) {
                    case 33: // pg up
                    case 37: // left
                    case 38: // up
                             api.prev();
                             break;
                    case 9:  // tab
                    case 32: // space
                    case 34: // pg down
                    case 39: // right
                    case 40: // down
                             api.next();
                             break;
                    case 187: // plus
                             api.zoomBy(config.kbdZoomAmount, config.kbdActionDuration);
                             break;
                    case 189: // minus
                             api.zoomBy(1 / config.kbdZoomAmount, config.kbdActionDuration);
                             break;
                }
                
                event.preventDefault();
            }
        }, false);
        
        
        document.addEventListener("mousemove", mousePan.onMouseMove);
        document.addEventListener("mousedown", function( event ) {
            //if the api variable wasn't global to this function and 
            //wasn't initialized in the init event, this would have looked
            //like the mousemove listener, alas...
            mousePan.onMouseDown(event, api);
        });
        document.addEventListener("mouseup", mousePan.onMouseUp);
        
        // delegated handler for clicking on the links to presentation steps
        document.addEventListener("click", function ( event ) {
            // event delegation with "bubbling"
            // check if event target (or any of its parents is a link)
            var target = event.target;
            while ( (target.tagName !== "A") &&
                    (target !== document.documentElement) ) {
                target = target.parentNode;
            }
            
            if ( target.tagName === "A" ) {
                var href = target.getAttribute("href");
                
                // if it's a link to presentation step, target this step
                if ( href && href[0] === '#' ) {
                    target = document.getElementById( href.slice(1) );
                }
            }
            
            if ( api.goto(target) ) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, false);
        
        // delegated handler for clicking on step elements
        document.addEventListener("click", function ( event ) {
            var target = event.target;
            // find closest step element that is not active
            while ( !(target.classList.contains("step") && !target.classList.contains("active")) &&
                    (target !== document.documentElement) ) {
                target = target.parentNode;
            }
            
            if ( api.goto(target) ) {
                event.preventDefault();
            }
        }, false);
        
        // touch handler to detect taps on the left and right side of the screen
        // based on awesome work of @hakimel: https://github.com/hakimel/reveal.js
        document.addEventListener("touchstart", function ( event ) {
            if (event.touches.length === 1) {
                var x = event.touches[0].clientX,
                    width = window.innerWidth * 0.3,
                    result = null;
                    
                if ( x < width ) {
                    result = api.prev();
                } else if ( x > window.innerWidth - width ) {
                    result = api.next();
                }
                
                if (result) {
                    event.preventDefault();
                }
            }
        }, false);
        
        // rescale presentation when window is resized
        window.addEventListener("resize", throttle(function () {
            // force going to active step again, to trigger rescaling
            api.goto( document.querySelector(".active"), 500 );
        }, 250), false);
        
        // zoom presentation with scroll wheel
        var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
        window.addEventListener(mousewheelevt, function ( event ) {
            var delta = event.detail? event.detail * (-120) : event.wheelDelta; //check for detail first so Opera uses that instead of wheelDelta

            if (delta > 0) {
                api.zoomBy(config.wheelZoomAmount, 0);
            } else {
                api.zoomBy(1 / config.wheelZoomAmount, 0);
            }
        }, false);
        
    }, false);
        
})(document, window);

// THAT'S ALL FOLKS!
//
// Thanks for reading it all.
// Or thanks for scrolling down and reading the last part.
//
// I've learnt a lot when building impress.js and I hope this code and comments
// will help somebody learn at least some part of it.
