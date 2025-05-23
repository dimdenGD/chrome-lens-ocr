// source: lens_overlay_request_type.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof window !== 'undefined' && window) ||
    (typeof global !== 'undefined' && global) ||
    (typeof self !== 'undefined' && self) ||
    (function () { return this; }).call(null) ||
    Function('return this')();

goog.exportSymbol('proto.lens.RequestType', null, global);
/**
 * @enum {number}
 */
proto.lens.RequestType = {
  REQUEST_TYPE_DEFAULT: 0,
  REQUEST_TYPE_PDF: 1,
  REQUEST_TYPE_EARLY_PARTIAL_PDF: 3,
  REQUEST_TYPE_WEBPAGE: 2
};

goog.object.extend(exports, proto.lens);
