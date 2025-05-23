// source: lens_overlay_selection_type.proto
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

goog.exportSymbol('proto.lens.LensOverlaySelectionType', null, global);
/**
 * @enum {number}
 */
proto.lens.LensOverlaySelectionType = {
  UNKNOWN_SELECTION_TYPE: 0,
  TAP_ON_EMPTY: 1,
  SELECT_TEXT_HIGHLIGHT: 3,
  REGION_SEARCH: 7,
  INJECTED_IMAGE: 10,
  TAP_ON_REGION_GLEAM: 15,
  MULTIMODAL_SEARCH: 18,
  SELECT_TRANSLATED_TEXT: 21,
  TAP_ON_OBJECT: 22,
  MULTIMODAL_SUGGEST_TYPEAHEAD: 25,
  MULTIMODAL_SUGGEST_ZERO_PREFIX: 26,
  TRANSLATE_CHIP: 52,
  SYMBOLIC_MATH_OBJECT: 53
};

goog.object.extend(exports, proto.lens);
