// source: lens_overlay_polygon.proto
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

goog.exportSymbol('proto.lens.CoordinateType', null, global);
goog.exportSymbol('proto.lens.Polygon', null, global);
goog.exportSymbol('proto.lens.Polygon.Vertex', null, global);
goog.exportSymbol('proto.lens.Polygon.VertexOrdering', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.lens.Polygon = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.lens.Polygon.repeatedFields_, null);
};
goog.inherits(proto.lens.Polygon, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.lens.Polygon.displayName = 'proto.lens.Polygon';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.lens.Polygon.Vertex = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.lens.Polygon.Vertex, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.lens.Polygon.Vertex.displayName = 'proto.lens.Polygon.Vertex';
}

/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.lens.Polygon.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.lens.Polygon.prototype.toObject = function(opt_includeInstance) {
  return proto.lens.Polygon.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.lens.Polygon} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.lens.Polygon.toObject = function(includeInstance, msg) {
  var f, obj = {
vertexList: jspb.Message.toObjectList(msg.getVertexList(),
    proto.lens.Polygon.Vertex.toObject, includeInstance),
vertexOrdering: jspb.Message.getFieldWithDefault(msg, 2, 0),
coordinateType: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.lens.Polygon}
 */
proto.lens.Polygon.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.lens.Polygon;
  return proto.lens.Polygon.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.lens.Polygon} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.lens.Polygon}
 */
proto.lens.Polygon.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.lens.Polygon.Vertex;
      reader.readMessage(value,proto.lens.Polygon.Vertex.deserializeBinaryFromReader);
      msg.addVertex(value);
      break;
    case 2:
      var value = /** @type {!proto.lens.Polygon.VertexOrdering} */ (reader.readEnum());
      msg.setVertexOrdering(value);
      break;
    case 3:
      var value = /** @type {!proto.lens.CoordinateType} */ (reader.readEnum());
      msg.setCoordinateType(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.lens.Polygon.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.lens.Polygon.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.lens.Polygon} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.lens.Polygon.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getVertexList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.lens.Polygon.Vertex.serializeBinaryToWriter
    );
  }
  f = message.getVertexOrdering();
  if (f !== 0.0) {
    writer.writeEnum(
      2,
      f
    );
  }
  f = message.getCoordinateType();
  if (f !== 0.0) {
    writer.writeEnum(
      3,
      f
    );
  }
};


/**
 * @enum {number}
 */
proto.lens.Polygon.VertexOrdering = {
  VERTEX_ORDERING_UNSPECIFIED: 0,
  CLOCKWISE: 1,
  COUNTER_CLOCKWISE: 2
};




if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.lens.Polygon.Vertex.prototype.toObject = function(opt_includeInstance) {
  return proto.lens.Polygon.Vertex.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.lens.Polygon.Vertex} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.lens.Polygon.Vertex.toObject = function(includeInstance, msg) {
  var f, obj = {
x: jspb.Message.getFloatingPointFieldWithDefault(msg, 1, 0.0),
y: jspb.Message.getFloatingPointFieldWithDefault(msg, 2, 0.0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.lens.Polygon.Vertex}
 */
proto.lens.Polygon.Vertex.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.lens.Polygon.Vertex;
  return proto.lens.Polygon.Vertex.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.lens.Polygon.Vertex} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.lens.Polygon.Vertex}
 */
proto.lens.Polygon.Vertex.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readFloat());
      msg.setX(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readFloat());
      msg.setY(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.lens.Polygon.Vertex.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.lens.Polygon.Vertex.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.lens.Polygon.Vertex} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.lens.Polygon.Vertex.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getX();
  if (f !== 0.0) {
    writer.writeFloat(
      1,
      f
    );
  }
  f = message.getY();
  if (f !== 0.0) {
    writer.writeFloat(
      2,
      f
    );
  }
};


/**
 * optional float x = 1;
 * @return {number}
 */
proto.lens.Polygon.Vertex.prototype.getX = function() {
  return /** @type {number} */ (jspb.Message.getFloatingPointFieldWithDefault(this, 1, 0.0));
};


/**
 * @param {number} value
 * @return {!proto.lens.Polygon.Vertex} returns this
 */
proto.lens.Polygon.Vertex.prototype.setX = function(value) {
  return jspb.Message.setProto3FloatField(this, 1, value);
};


/**
 * optional float y = 2;
 * @return {number}
 */
proto.lens.Polygon.Vertex.prototype.getY = function() {
  return /** @type {number} */ (jspb.Message.getFloatingPointFieldWithDefault(this, 2, 0.0));
};


/**
 * @param {number} value
 * @return {!proto.lens.Polygon.Vertex} returns this
 */
proto.lens.Polygon.Vertex.prototype.setY = function(value) {
  return jspb.Message.setProto3FloatField(this, 2, value);
};


/**
 * repeated Vertex vertex = 1;
 * @return {!Array<!proto.lens.Polygon.Vertex>}
 */
proto.lens.Polygon.prototype.getVertexList = function() {
  return /** @type{!Array<!proto.lens.Polygon.Vertex>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.lens.Polygon.Vertex, 1));
};


/**
 * @param {!Array<!proto.lens.Polygon.Vertex>} value
 * @return {!proto.lens.Polygon} returns this
*/
proto.lens.Polygon.prototype.setVertexList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.lens.Polygon.Vertex=} opt_value
 * @param {number=} opt_index
 * @return {!proto.lens.Polygon.Vertex}
 */
proto.lens.Polygon.prototype.addVertex = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.lens.Polygon.Vertex, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.lens.Polygon} returns this
 */
proto.lens.Polygon.prototype.clearVertexList = function() {
  return this.setVertexList([]);
};


/**
 * optional VertexOrdering vertex_ordering = 2;
 * @return {!proto.lens.Polygon.VertexOrdering}
 */
proto.lens.Polygon.prototype.getVertexOrdering = function() {
  return /** @type {!proto.lens.Polygon.VertexOrdering} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {!proto.lens.Polygon.VertexOrdering} value
 * @return {!proto.lens.Polygon} returns this
 */
proto.lens.Polygon.prototype.setVertexOrdering = function(value) {
  return jspb.Message.setProto3EnumField(this, 2, value);
};


/**
 * optional CoordinateType coordinate_type = 3;
 * @return {!proto.lens.CoordinateType}
 */
proto.lens.Polygon.prototype.getCoordinateType = function() {
  return /** @type {!proto.lens.CoordinateType} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {!proto.lens.CoordinateType} value
 * @return {!proto.lens.Polygon} returns this
 */
proto.lens.Polygon.prototype.setCoordinateType = function(value) {
  return jspb.Message.setProto3EnumField(this, 3, value);
};


/**
 * @enum {number}
 */
proto.lens.CoordinateType = {
  COORDINATE_TYPE_UNSPECIFIED: 0,
  NORMALIZED: 1,
  IMAGE: 2
};

goog.object.extend(exports, proto.lens);
