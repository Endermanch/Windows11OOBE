define(['lib/knockout'], (ko) => {
    window.ko = ko; // Enable the glocal varable ko used by knockout-winjs
    require(['lib/knockout-winjs-src']);
})