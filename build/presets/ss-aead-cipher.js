'use strict';Object.defineProperty(exports,'__esModule',{value:true});var _slicedToArray=function(){function sliceIterator(arr,i){var _arr=[];var _n=true;var _d=false;var _e=undefined;try{for(var _i=arr[Symbol.iterator](),_s;!(_n=(_s=_i.next()).done);_n=true){_arr.push(_s.value);if(i&&_arr.length===i)break}}catch(err){_d=true;_e=err}finally{try{if(!_n&&_i['return'])_i['return']()}finally{if(_d)throw _e}}return _arr}return function(arr,i){if(Array.isArray(arr)){return arr}else if(Symbol.iterator in Object(arr)){return sliceIterator(arr,i)}else{throw new TypeError('Invalid attempt to destructure non-iterable instance')}}}();var _crypto=require('crypto');var _crypto2=_interopRequireDefault(_crypto);var _utils=require('../utils');var _defs=require('./defs');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}const NONCE_LEN=12;const TAG_LEN=16;const MIN_CHUNK_LEN=TAG_LEN*2+3;const MIN_CHUNK_SPLIT_LEN=2048;const MAX_CHUNK_SPLIT_LEN=16383;const ciphers=['aes-128-gcm','aes-192-gcm','aes-256-gcm'];const HKDF_HASH_ALGORITHM='sha1';class SsAeadCipherPreset extends _defs.IPreset{constructor({method,info}){super();this._cipherName='';this._info=null;this._cipherKey=null;this._decipherKey=null;this._cipherNonce=0;this._decipherNonce=0;this._adBuf=null;if(typeof method==='undefined'||method===''){throw Error('\'method\' must be set.')}if(!ciphers.includes(method)){throw Error(`method '${method}' is not supported.`)}this._cipherName=method;this._info=Buffer.from(info);this._adBuf=new _utils.AdvancedBuffer({getPacketLength:this.onReceiving.bind(this)});this._adBuf.on('data',this.onChunkReceived.bind(this))}beforeOut({buffer}){let salt=null;if(this._cipherKey===null){const size=this._cipherName.split('-')[1]/8;salt=_crypto2.default.randomBytes(size);this._cipherKey=(0,_utils.HKDF)(HKDF_HASH_ALGORITHM,salt,(0,_utils.EVP_BytesToKey)(__KEY__,size,16),this._info,size)}const chunks=(0,_utils.getRandomChunks)(buffer,MIN_CHUNK_SPLIT_LEN,MAX_CHUNK_SPLIT_LEN).map(chunk=>{const dataLen=(0,_utils.numberToBuffer)(chunk.length);var _encrypt=this.encrypt(dataLen),_encrypt2=_slicedToArray(_encrypt,2);const encLen=_encrypt2[0],lenTag=_encrypt2[1];var _encrypt3=this.encrypt(chunk),_encrypt4=_slicedToArray(_encrypt3,2);const encData=_encrypt4[0],dataTag=_encrypt4[1];return Buffer.concat([encLen,lenTag,encData,dataTag])});if(salt){return Buffer.concat([salt,...chunks])}else{return Buffer.concat(chunks)}}beforeIn({buffer,next,fail}){this._adBuf.put(buffer,{next,fail})}onReceiving(buffer,{fail}){if(this._decipherKey===null){const size=this._cipherName.split('-')[1]/8;if(buffer.length<size){return}const salt=buffer.slice(0,size);this._decipherKey=(0,_utils.HKDF)(HKDF_HASH_ALGORITHM,salt,(0,_utils.EVP_BytesToKey)(__KEY__,size,16),this._info,size);return buffer.slice(size)}if(buffer.length<MIN_CHUNK_LEN){return}var _ref=[buffer.slice(0,2),buffer.slice(2,2+TAG_LEN)];const encLen=_ref[0],lenTag=_ref[1];const dataLen=this.decrypt(encLen,lenTag);if(dataLen===null){fail(`unexpected DataLen_TAG=${lenTag.toString('hex')} when verify DataLen=${encLen.toString('hex')}`);return-1}return 2+TAG_LEN+dataLen.readUInt16BE(0)+TAG_LEN}onChunkReceived(chunk,{next,fail}){var _ref2=[chunk.slice(2+TAG_LEN,-TAG_LEN),chunk.slice(-TAG_LEN)];const encData=_ref2[0],dataTag=_ref2[1];const data=this.decrypt(encData,dataTag);if(data===null){fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0,60).toString('hex')}`);return}next(data)}encrypt(message){const cipher=_crypto2.default.createCipheriv(this._cipherName,this._cipherKey,(0,_utils.numberToBuffer)(this._cipherNonce,NONCE_LEN,_utils.BYTE_ORDER_LE));const encrypted=Buffer.concat([cipher.update(message),cipher.final()]);const tag=cipher.getAuthTag();this._cipherNonce+=1;return[encrypted,tag]}decrypt(ciphertext,tag){const decipher=_crypto2.default.createDecipheriv(this._cipherName,this._decipherKey,(0,_utils.numberToBuffer)(this._decipherNonce,NONCE_LEN,_utils.BYTE_ORDER_LE));decipher.setAuthTag(tag);try{const decrypted=Buffer.concat([decipher.update(ciphertext),decipher.final()]);this._decipherNonce+=1;return decrypted}catch(err){return null}}}exports.default=SsAeadCipherPreset;