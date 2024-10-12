/**
 * @name pubsub.js
 * @description Facilitates subscribing listeners to remarkable events.
 * @author ptrdo@users.noreply.github.com
 * @version 0.1.0, 2022/01/04
 * @requires ES6
 *
 * @usage pubsub.subscribe("default", "uniqueIdentifier", someFunction);
 * @usage pubsub.subscribeMultiple(["signin","signout"], "uniqueIdentifier", someFunction);
 * @usage pubsub.unsubscribe("default", "uniqueIdentifier"); // removes listeners of that event which are so-named
 * @usage pubsub.unsubscribeObserver("uniqueIdentifier"); // removes all listeners of observer
 * @usage pubsub.publish("default", someRelevantContextualData);
 */
const pubsub = {
    events: {
        "default": []
    },
    getEvents: function() { return this.events; },
    subscribe: function (eventName, observer, callback) {
        if (!!eventName) {
            if (!!callback && callback instanceof Function) {
                this.events[eventName] = this.events[eventName] || [];
                this.events[eventName].push({ observer: observer, callback: callback });
            } else if (/^http/i.test(observer)) {
                this.events[eventName] = this.events[eventName] || [];
                this.events[eventName].push({ observer: observer, payload: callback });
            }
        } else {
            console.error("app.pubsub:",'"Attempt to subscribe to unknown event!" Use:', Object.keys(this.events));
        }
    },
    subscribeMultiple: function (eventNames, observer, callback) {
        if (!!eventNames && Array.isArray(eventNames)) {
            if (!!callback && callback instanceof Function) {
                eventNames.forEach(name => {
                    this.events[name] = this.events[name] || [];
                    this.events[name].push({ observer: observer, callback: callback });
                });
            }
        } else {
            console.error("app.pubsub:",'"Attempt to subscribe to unknown events!" Use:', Object.keys(this.events));
        }
    },
    unsubscribe: function (eventName, observer) {
        if (!!eventName && eventName in this.events) {
            for (let i = 0; i < this.events[eventName].length; i++) {
                if (this.events[eventName][i].observer === observer) {
                    this.events[eventName].splice(i, 1);
                    break;
                }
            };
        } else {
            console.error("app.pubsub:",'"Attempt to unsubscribe from unknown event!" Use:', Object.keys(this.events));
        }
    },
    unsubscribeObserver: function (observer) {
        if (!!observer) {
            for (const [key,value] of Object.entries(this.events)) {
                this.events[key] = value.filter(subscription => subscription.observer !== observer)
            }
        } else {
            console.error("app.pubsub:",'"Attempt to unsubscribe an undefined observer!"');
        }
    },
    publish: function (eventName, data) {
        let self = this;
        if (this.events[eventName]) {
            this.events[eventName].forEach(function (instance) {
                try {
                    if ("payload" in instance) {
                        self.publishRemotely(instance, data);
                    } else {
                        instance.callback(data);
                    }
                } catch (err) {
                    console.warn("app.pubsub:", eventName, instance);
                }
            });
        }
    },
    publishRemotely: function (info, data) {

        let child = null;
        for (let i = 0; i < window.frames.length; i++) {
            if (window.frames[i].location.href == info.observer) {
                child = window.frames[i];
            }
        }
        if (!!child && "postMessage" in child) {
            child.postMessage(info, window.location.origin);
        } else {
            if (!!window.opener && !window.opener.closed) {
                window.opener.postMessage(info,"*");
            } else {
                console.warn("app.pubsub:","Attempt to postMessage to unfound target!", info);
            }
        }
    },
    isSubscribed: function (eventName) {
        return eventName in this.events && this.events[eventName].length > 0;
    },
    isSubscribedByWho: function (eventName) {
        if (this.events && eventName in this.events) {
            return this.events[eventName];
        } else {
            return null;
        }
    },
    initialize: function () {
        for (let listener in this.events) {
            this.events[listener] = [];
        }
    },
    /**
     * initPostMessaging sets a global listener for postMessage calls (from iframes or popups).
     * NOTE: Some calls can be async (e/g "app.auth.getTokenAsync") but Promises are needed!
     * 
     * @usage (from remote page) window.parent.postMessage(dataObject);
     * @param {String} dataObject.observer:window.location.href (required) the remote page URL
     * @param {String} dataObject.method (OR getter OR rest) the dot notation, e/g "app.pubsub.subscribe"
     * @param {String} dataObject.getter (OR method OR rest) the dot notation, e/g "app.app.getVersion"
     * @param {String} dataObject.rest (OR method OR getter) the dot notation, e/g "app.restclient.get"
     * @param {String} dataObject.eventName (deprecated, use args) e/g "index.body.click"
     * @param {String|Array|JSON} dataObject.args (as expected) e/g "foo" || ["foo","bar"] || {"foo":["bar"]}
     * @return varies
     */
    initPostMessaging: function () {
        let self = this, response = null;
        window.addEventListener("message", (event) => {
            if (!!event && "isTrusted" in event && !!event.isTrusted) {
                if ("data" in event && "type" in event.data && /authorization_response/.test(event.data.type)) {
                    
                    // likely a message from oauth or elsewhere...
                    this.publish("postMessage", event.data.response || {});
                    window.app["postMessage"] = Object.assign(app.postMessage || {}, event.data.response || {});

                } else if ("data" in event && event.data.constructor.name === "Object") {
                    
                    if ("method" in event.data) {
                        
                        // calls that are one-directional
                        if (/pubsub/i.test(event.data.method)) {
                            let method = event.data.method.split(".").pop();
                            switch (method) {
                                case "subscribe":
                                case "subscribeMultiple":
                                    this.subscribe(event.data.args, event.data.observer, event.data);
                                    break;
                                case "unsubscribe":
                                    this.subscribe(event.data.args, event.data.observer);
                                    break;
                                case "unsubscribeObserver":
                                    this.subscribe(event.data.observer);
                                    break;
                            }
                        } else {
                            
                            try {
                                response = this.executeDotNotation(window, event.data.method, event.data.args);
                                self.publishRemotely({ response:response, observer:event.data.observer, info:event.data });
                            } catch (e) {
                                console.error(e, "postMessage.method(app.pubsub.executeDotNotation)", event.data);
                            }
                        }
                    } else if ("getter" in event.data) {
                        
                        // (async) calls expecting a payload response
                        try {
                            if (/async/i.test(event.data.getter)) {
                                this.executeDotNotation(window, event.data.getter, event.data.args, info => {
                                    self.publishRemotely({ response:info, observer:event.data.observer, info:event.data })
                                });
                            } else {
                                response = this.executeDotNotation(window, event.data.getter, event.data.args);
                                self.publishRemotely({ response:response, observer:event.data.observer, info:event.data });
                            }
                        } catch (e) {
                            console.error(e, "postMessage.getter(app.pubsub.executeDotNotation)", event.data);
                        }
                        
                    } else if ("rest" in event.data) {
                        
                        // calls that will assume a success/fail response 
                        try {
                            this.executeDotNotation(window, event.data.rest, event.data.args, null, { observer:event.data.observer, info:event.data });
                            
                        } catch (e) {
                            console.error(e, "postMessage.rest(app.pubsub.executeDotNotation)", event.data);
                        }

                    } else {
                        console.error("app.pubsub.initPostMessaging", "a message was heard but not understood:", event.data);
                    }
                } else {
                    console.error("app.pubsub.initPostMessaging", "a message was heard but not understood:", event.data);
                }
            }
        }, false);
        this.events["postMessage"] = [];
    },
    print: function () {
        return this.events;
    },
    /**
     * PubSubEventArgs is a convenience constructor.
     * Note: Utilized by ScriptSharp. Please deprecate.
     * @param sender
     * @param data
     * @param name
     * @constructor
     */
    PubSubEventArgs: function (sender, data, name) {
        this.isLastPublishedEvent = false;
        this.sender = sender;
        this.data = data;
        this.name = name;
    }
};
/**
 * addEventListener subscribes a callback to a remarkable event.
 * this suggests an alternative syntax.
 *
 * @public
 * @param {String} eventName is expected to be either "signin" or "signout".
 * @param {String|*} observer is any unique identifier. e/g "app.context.refresh"
 * @param {Function} callback is the code to execute upon publish of event.
 * @return {null}
 */
const addEventListener = function (eventName, observer, callback) {
    pubsub.subscribe(eventName, observer, callback);
};

/**
 * removeEventListener unsubscribes a callback from a remarkable event.
 * this suggests an alternative syntax.
 *
 * @public
 * @param {String} eventName is expected to be either "signin" or "signout".
 * @param {String|*} observer is any unique identifier. e/g "app.context.refresh"
 * @param {Function} callback is the code to execute upon publish of event.
 * @return {null}
 */
const removeEventListener = function (eventName, observer, callback) {
    pubsub.unsubscribe(eventName, observer, callback);
};

/**
 * clearEventListeners unsubscribes all callbacks from remarkable events.
 * this suggests an alternative syntax.
 *
 * @public
 * @return {null}
 */
const clearEventListeners = function() {
    pubsub.initialize();
};

export default pubsub;