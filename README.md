
# PubSub.js - Event Subscription Utility

## Overview

**PubSub.js** is a lightweight JavaScript utility that facilitates event-driven programming by allowing you to subscribe to, publish, and manage events. It supports subscribing multiple observers to events and triggering callbacks when those events are published. It also includes advanced features for handling inter-window communication using `postMessage`.

## Features
- **Subscribe/Unsubscribe**: Add or remove event listeners with ease.
- **Multiple Subscriptions**: Subscribe to multiple events at once.
- **Event Publishing**: Trigger event callbacks with optional contextual data.
- **Observer Management**: Remove specific observers or all associated event listeners.
- **PostMessage Support**: Publish and subscribe to events across windows or iframes using `postMessage`.

## Usage

### Import the Module
```javascript
import pubsub from './pubsub.js';
```

### Subscribe to an Event
```javascript
pubsub.subscribe("default", "uniqueIdentifier", someFunction);
```
- `eventName`: Name of the event to subscribe to (e.g., "default").
- `observer`: A unique identifier for the subscriber.
- `callback`: The function to call when the event is published.

### Subscribe to Multiple Events
```javascript
pubsub.subscribeMultiple(["signin", "signout"], "uniqueIdentifier", someFunction);
```
- `eventNames`: Array of event names to subscribe to.
- `observer`: A unique identifier for the subscriber.
- `callback`: The function to call for all subscribed events.

### Unsubscribe from an Event
```javascript
pubsub.unsubscribe("default", "uniqueIdentifier");
```
- `eventName`: The event name from which to unsubscribe.
- `observer`: The identifier of the observer to remove.

### Unsubscribe an Observer from All Events
```javascript
pubsub.unsubscribeObserver("uniqueIdentifier");
```

### Publish an Event
```javascript
pubsub.publish("default", { key: "value" });
```
- `eventName`: The event to publish.
- `data`: Optional data to pass to the event callback.

### Initialize PostMessaging
```javascript
pubsub.initPostMessaging();
```
Sets up a global listener to handle cross-window messaging via `postMessage`.

### Check Subscription Status
```javascript
pubsub.isSubscribed("default");
```
Returns `true` if there are any subscribers to the event.

## Example

```javascript
// Define a callback function
function onEvent(data) {
    console.log("Event received:", data);
}

// Subscribe to an event
pubsub.subscribe("userLogin", "myComponent", onEvent);

// Publish the event with some data
pubsub.publish("userLogin", { username: "john_doe" });

// Unsubscribe the observer
pubsub.unsubscribe("userLogin", "myComponent");
```

## License
This project is licensed under the MIT License.

## Author
Created by ptrdo@users.noreply.github.com. Version 0.1.0 (2022/01/04).
