/******************************************************************************/

import {
    deserialize,
    deserializeAsync,
    serialize,
    serializeAsync,
} from '../s14e-serializer.js';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

/******************************************************************************/

const Green = '\x1b[32m';
const Red = '\x1b[31m';
const NoColor = '\x1b[0m';

const fromCodePoint = v =>
    String.fromCodePoint(v);

const strFromPassOrFail = (result, expect = true) => [
    result === expect ? `${Green}ok` : `  `,
    ' ',
    result ? `${Green}pass` : `${Red}fail`,
    NoColor,
].join('');

function assertEqual(actual, expected) {
    let pass, extra;
    try {
        assert.deepEqual(actual, expected);
        pass = true;
    } catch(_) {
        extra = `${actual} => ${expected}`;
        pass = false;
    }
    const message = [
        strFromPassOrFail(pass),
        typeof actual === 'object'
            ? Object.prototype.toString.call(actual)
            : actual,
        ' ',
        extra,
    ].join(' ');
    console.log(message);
}

function assertPass(result, message) {
    const out = [
        strFromPassOrFail(result),
        message,
    ].join(' ');
    console.log(out);
}

function assertFail(result, message) {
    const out = [
        strFromPassOrFail(!result, false),
        message,
    ].join(' ');
    console.log(out);
}

function cloneData(data, options = {}) {
    return deserialize(serialize(data, options));
}

function cloneTest(value) {
    assertEqual(value, cloneData(value));
}

// I shamelessly pilfered some test units data from:
// https://github.com/zloirock/core-js/blob/master/tests/unit-global/web.structured-clone.js#L20C1-L72C1

(async ( ) => {
    const data = [
        undefined,
        null,
        false,
        true,
        NaN,
        -Infinity,
        -Number.MAX_VALUE,
        -0xFFFFFFFF,
        -0x80000000,
        -0x7FFFFFFF,
        -1,
        -Number.MIN_VALUE,
        0,
        1,
        Number.MIN_VALUE,
        0x7FFFFFFF,
        0x80000000,
        0xFFFFFFFF,
        Number.MAX_VALUE,
        Infinity,
        -12345678901234567890n,
        -1n,
        0n,
        1n,
        12345678901234567890n,
        '',
        'this is a sample string',
        'null(\0)',
        'français',
        `emojis: ${fromCodePoint(0x1F600)}... ${fromCodePoint(0x1F914)}...`,
        new Boolean(false),
        new Boolean(true),
        new Number(0),
        new Number(1),
        new String(''),
        new String('this is a sample string'),
        /^.+regex.+\.$/,
        new RegExp('^.+regex.+\\.$'),
        new RegExp(),
        /abc/,
        /abc/g,
        /abc/i,
        /abc/gi,
        /abc/,
        /abc/g,
        /abc/i,
        /abc/gi,
        /abc/giuy,
        new Date(-1e13),
        new Date(-1e12),
        new Date(-1e9),
        new Date(-1e6),
        new Date(-1e3),
        new Date(0),
        new Date(1e3),
        new Date(1e6),
        new Date(1e9),
        new Date(1e12),
        new Date(1e13),
        [ 1, 2, 3, 4, 'toto' ],
        // new Array(5), // fails, need to investigate
        { foo: 1, bar: 'baz' },
        new Map(),
        new Map([ [ 'foo', 'bar' ], [ 1234, 'baz' ] ]),
        new Set(),
        new Set([ 'foo', 'bar', 1234, 'baz' ]),
        new Uint8Array(128),
        new Uint8Array([]),
        new Uint8Array([0, 1, 254, 255]),
        new Uint8ClampedArray([0, 1, 254, 2]),
        new Uint16Array([0x0000, 0x0001, 0xFFFE, 0xFFFF]),
        new Uint32Array([0x00000000, 0x00000001, 0xFFFFFFFE, 0xFFFFFFFF]),
        new Int8Array([0, 1, 254, 255]),
        new Int16Array([0x0000, 0x0001, 0xFFFE, 0xFFFF]),
        new Int32Array([0x00000000, 0x00000001, 0xFFFFFFFE, 0xFFFFFFFF]),
        new Float32Array([-Infinity, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, Infinity]),
        new Float64Array([-Infinity, -Number.MAX_VALUE, -Number.MIN_VALUE, 0, Number.MIN_VALUE, Number.MAX_VALUE, Infinity]),
    ];

    // Built-in types
    for ( const value of data ) {
        cloneTest(value);
    }
    cloneTest(data);

    // Serializing a function should fail 
    {
        const fn = function(){};
        const clone = cloneData(fn);
        assertFail(clone === undefined, 'Serializing a function should fail');
    }

    // Self-reference in Object
    {
        const value = { data };
        value.top = value;
        const clone = cloneData(value);
        assertPass(clone === clone.top, 'Self-reference in Object');
    }

    // Self-reference in Array
    {
        data.unshift(data);
        const clone = cloneData(data);
        assertPass(clone === clone[0], 'Self-reference in Array');
    }

    // Multiple references to same Object
    {
        const obj = { id: 1 };
        data.unshift(obj);
        data.push(obj);
        const clone = cloneData(data);
        assertPass(clone[0] === clone.at(-1), 'Multiple references to same Object');
    }

    // Multiple typed array with same underlying ArrayBuffer
    {
        const obj = {};
        obj.u32 = new Uint32Array(64);
        for ( let i = 0; i < obj.u32.length / 2; i++ ) {
            obj.u32[i] = i;
        }
        for ( let i = obj.u32.length / 2; i < obj.u32.length; i++ ) {
            obj.u32[i] = 0xFFFFFFFF - obj.u32.length + i;
        }
        obj.u8 = new Uint8Array(obj.u32.buffer, 64, 128);
        const clone = cloneData(obj);
        assertPass(clone.u8.buffer === clone.u32.buffer, 'ArrayBuffer shared by multiple typed arrays');
        assert.deepEqual(obj, clone);
    }

    const text = await readFile('./s14e-serializer.js', { encoding: 'utf8' });

    // Promise-based
    {
        const s = await serializeAsync(text);
        const clone = await deserializeAsync(s);
        assertPass(clone === text, 'Serialized-deserialized asynchronously');
    }

    // Compression-decompression
    {
        const s0 = serialize(text);
        const s1 = serialize(text, { compress: true });
        assertPass(true, `Compression after/before: ${s1.length}/${s0.length}`);
        const clone = deserialize(s1);
        assertPass(clone === text, 'Deserialized from compressed serialization');
    }
})();
