#!/usr/bin/env node
import readline from "node:readline";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

//#region node_modules/zod/v4/core/core.js
/** A special constant with type `never` */
const NEVER = Object.freeze({ status: "aborted" });
function $constructor(name, initializer, params) {
	function init(inst, def) {
		if (!inst._zod) Object.defineProperty(inst, "_zod", {
			value: {
				def,
				constr: _,
				traits: /* @__PURE__ */ new Set()
			},
			enumerable: false
		});
		if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		const proto = _.prototype;
		const keys = Object.keys(proto);
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i];
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
const globalConfig = {};
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}

//#endregion
//#region node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	return { get value() {
		{
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
	} };
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const valDecCount = (val.toString().split(".")[1] || "").length;
	const stepString = step.toString();
	let stepDecCount = (stepString.split(".")[1] || "").length;
	if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
		const match = stepString.match(/\d?e-(\d?)/);
		if (match?.[1]) stepDecCount = Number.parseInt(match[1]);
	}
	const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
	return Number.parseInt(val.toFixed(decCount).replace(".", "")) % Number.parseInt(step.toFixed(decCount).replace(".", "")) / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = cached(() => {
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = schema._zod.def.shape;
		for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function merge$1(a, b) {
	return clone(a, mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: []
	}));
}
function partial(Class, schema, mask) {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class ? new Class({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class ? new Class({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function required(Class, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const oldShape = schema._zod.def.shape;
		const shape = { ...oldShape };
		if (mask) for (const key in mask) {
			if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
			if (!mask[key]) continue;
			shape[key] = new Class({
				type: "nonoptional",
				innerType: oldShape[key]
			});
		}
		else for (const key in oldShape) shape[key] = new Class({
			type: "nonoptional",
			innerType: oldShape[key]
		});
		assignProp(this, "shape", shape);
		return shape;
	} }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
	const full = {
		...iss,
		path: iss.path ?? []
	};
	if (!iss.message) full.message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	delete full.inst;
	delete full.continue;
	if (!ctx?.reportInput) delete full.input;
	return full;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}

//#endregion
//#region node_modules/zod/v4/core/errors.js
const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues });
		else if (issue.code === "invalid_element") processError({ issues: issue.issues });
		else if (issue.path.length === 0) fieldErrors._errors.push(mapper(issue));
		else {
			let curr = fieldErrors;
			let i = 0;
			while (i < issue.path.length) {
				const el = issue.path[i];
				if (!(i === issue.path.length - 1)) curr[el] = curr[el] || { _errors: [] };
				else {
					curr[el] = curr[el] || { _errors: [] };
					curr[el]._errors.push(mapper(issue));
				}
				curr = curr[el];
				i++;
			}
		}
	};
	processError(error);
	return fieldErrors;
}

//#endregion
//#region node_modules/zod/v4/core/parse.js
const _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
	return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};

//#endregion
//#region node_modules/zod/v4/core/regexes.js
const cuid = /^[cC][^\s-]{8,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time}(?:${opts.join("|")})`;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;

//#endregion
//#region node_modules/zod/v4/core/checks.js
const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) {
			if (def.inclusive) bag.maximum = def.value;
			else bag.exclusiveMaximum = def.value;
		}
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) {
			if (def.inclusive) bag.minimum = def.value;
			else bag.exclusiveMinimum = def.value;
		}
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		var _a;
		(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});

//#endregion
//#region node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};

//#endregion
//#region node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 3,
	patch: 6
};

//#endregion
//#region node_modules/zod/v4/core/schemas.js
const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	defineLazy(inst, "~standard", () => ({
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	}));
});
const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			const url = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: def.hostname.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv6`;
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const parts = payload.value.split("/");
		try {
			if (parts.length !== 2) throw new Error();
			const [address, prefix] = parts;
			if (!prefix) throw new Error();
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64";
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64url";
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, isOptionalOut) {
	if (result.issues.length) {
		if (isOptionalOut && !(key in input)) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (result.value === void 0) {
		if (key in input) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		keys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const isOptionalOut = _catchall.optout === "optional";
	for (const key in input) {
		if (keySet.has(key)) continue;
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalOut)));
		else handlePropertyResult(r, payload, key, input, isOptionalOut);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
		const sh = def.shape;
		Object.defineProperty(def, "shape", { get: () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			return newSh;
		} });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const isObject$2 = isObject;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = {};
		const proms = [];
		const shape = value.shape;
		for (const key of value.keys) {
			const el = shape[key];
			const isOptionalOut = el._zod.optout === "optional";
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalOut)));
			else handlePropertyResult(r, payload, key, input, isOptionalOut);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
	};
});
const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {};`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			const isOptionalOut = shape[key]?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(key)};`);
			if (isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
			else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$1 = isObject;
	const jit = !globalConfig.jitless;
	const allowsEval$1 = allowsEval;
	const fastEnabled = jit && allowsEval$1.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const single = def.options.length === 1;
	const first = def.options[0]._zod.run;
	inst._zod.parse = (payload, ctx) => {
		if (single) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
const $ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
	def.inclusive = false;
	$ZodUnion.init(inst, def);
	const _super = inst._zod.parse;
	defineLazy(inst._zod, "propValues", () => {
		const propValues = {};
		for (const option of def.options) {
			const pv = option._zod.propValues;
			if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
			for (const [k, v] of Object.entries(pv)) {
				if (!propValues[k]) propValues[k] = /* @__PURE__ */ new Set();
				for (const val of v) propValues[k].add(val);
			}
		}
		return propValues;
	});
	const disc = cached(() => {
		const opts = def.options;
		const map = /* @__PURE__ */ new Map();
		for (const o of opts) {
			const values = o._zod.propValues?.[def.discriminator];
			if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
			for (const v of values) {
				if (map.has(v)) throw new Error(`Duplicate discriminator value "${String(v)}"`);
				map.set(v, o);
			}
		}
		return map;
	});
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isObject(input)) {
			payload.issues.push({
				code: "invalid_type",
				expected: "object",
				input,
				inst
			});
			return payload;
		}
		const opt = disc.value.get(input?.[def.discriminator]);
		if (opt) return opt._zod.run(payload, ctx);
		if (def.unionFallback) return _super(payload, ctx);
		payload.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: def.discriminator,
			input,
			path: [def.discriminator],
			inst
		});
		return payload;
	};
});
const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
		unrecIssue ?? (unrecIssue = iss);
		for (const k of iss.keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k).l = true;
		}
	} else result.issues.push(iss);
	for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
		if (!unrecKeys.has(k)) unrecKeys.set(k, {});
		unrecKeys.get(k).r = true;
	}
	else result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length && unrecIssue) result.issues.push({
		...unrecIssue,
		keys: bothKeys
	});
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
	const values = new Set(def.values);
	inst._zod.values = values;
	inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (result.issues.length && input === void 0) return {
		issues: [],
		value: void 0
	};
	return result;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, payload.value));
			return handleOptionalResult(result, payload.value);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => {
			payload.value = result.value;
			if (result.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
		}
		return payload;
	};
});
const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues
	}, ctx);
}
const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
	defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}

//#endregion
//#region node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;

//#endregion
//#region node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class({
		type: "string",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	});
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}

//#endregion
//#region node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		external: params?.external ?? void 0
	};
}
function process$1(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			process$1(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) Object.assign(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && result.schema._prefault) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
			};
		}
		if (entry[1] === root) return { ref: "#" };
		const defUriPrefix = `#/${defsSegment}/`;
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + defId
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") {
				extractToDef(entry);
				continue;
			}
		}
	}
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else Object.assign(schema, refSchema);
			Object.assign(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	Object.assign(result, root.def ?? root.schema);
	const defs = ctx.external?.defs ?? {};
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) defs[seen.defId] = seen.def;
	}
	if (ctx.external) {} else if (Object.keys(defs).length > 0) {
		if (ctx.target === "draft-2020-12") result.$defs = defs;
		else result.definitions = defs;
	}
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	process$1(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	process$1(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};

//#endregion
//#region node_modules/zod/v4/core/json-schema-processors.js
const formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
const stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time") delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const regexes = [...patterns];
		if (regexes.length === 1) json.pattern = regexes[0].source;
		else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
const numberProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
	if (typeof format === "string" && format.includes("int")) json.type = "integer";
	else json.type = "number";
	if (typeof exclusiveMinimum === "number") {
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
			json.minimum = exclusiveMinimum;
			json.exclusiveMinimum = true;
		} else json.exclusiveMinimum = exclusiveMinimum;
	}
	if (typeof minimum === "number") {
		json.minimum = minimum;
		if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
			if (exclusiveMinimum >= minimum) delete json.minimum;
			else delete json.exclusiveMinimum;
		}
	}
	if (typeof exclusiveMaximum === "number") {
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
			json.maximum = exclusiveMaximum;
			json.exclusiveMaximum = true;
		} else json.exclusiveMaximum = exclusiveMaximum;
	}
	if (typeof maximum === "number") {
		json.maximum = maximum;
		if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
			if (exclusiveMaximum <= maximum) delete json.maximum;
			else delete json.exclusiveMaximum;
		}
	}
	if (typeof multipleOf === "number") json.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
const bigintProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("BigInt cannot be represented in JSON Schema");
};
const symbolProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Symbols cannot be represented in JSON Schema");
};
const nullProcessor = (_schema, ctx, json, _params) => {
	if (ctx.target === "openapi-3.0") {
		json.type = "string";
		json.nullable = true;
		json.enum = [null];
	} else json.type = "null";
};
const undefinedProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
};
const voidProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Void cannot be represented in JSON Schema");
};
const neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {};
const unknownProcessor = (_schema, _ctx, _json, _params) => {};
const dateProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Date cannot be represented in JSON Schema");
};
const enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
	const def = schema._zod.def;
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
	} else if (typeof val === "bigint") {
		if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
		else vals.push(Number(val));
	} else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
const nanProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("NaN cannot be represented in JSON Schema");
};
const templateLiteralProcessor = (schema, _ctx, json, _params) => {
	const _json = json;
	const pattern = schema._zod.pattern;
	if (!pattern) throw new Error("Pattern not found in template literal");
	_json.type = "string";
	_json.pattern = pattern.source;
};
const fileProcessor = (schema, _ctx, json, _params) => {
	const _json = json;
	const file = {
		type: "string",
		format: "binary",
		contentEncoding: "binary"
	};
	const { minimum, maximum, mime } = schema._zod.bag;
	if (minimum !== void 0) file.minLength = minimum;
	if (maximum !== void 0) file.maxLength = maximum;
	if (mime) {
		if (mime.length === 1) {
			file.contentMediaType = mime[0];
			Object.assign(_json, file);
		} else {
			Object.assign(_json, file);
			_json.anyOf = mime.map((m) => ({ contentMediaType: m }));
		}
	} else Object.assign(_json, file);
};
const successProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
const customProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
};
const functionProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Function types cannot be represented in JSON Schema");
};
const transformProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
};
const mapProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Map cannot be represented in JSON Schema");
};
const setProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Set cannot be represented in JSON Schema");
};
const arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = schema._zod.bag;
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = process$1(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
const objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	json.properties = {};
	const shape = def.shape;
	for (const key in shape) json.properties[key] = process$1(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	});
	const allKeys = new Set(Object.keys(shape));
	const requiredKeys = new Set([...allKeys].filter((key) => {
		const v = def.shape[key]._zod;
		if (ctx.io === "input") return v.optin === void 0;
		else return v.optout === void 0;
	}));
	if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = process$1(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
const unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => process$1(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
const intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = process$1(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = process$1(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
};
const tupleProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "array";
	const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
	const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
	const prefixItems = def.items.map((x, i) => process$1(x, ctx, {
		...params,
		path: [
			...params.path,
			prefixPath,
			i
		]
	}));
	const rest = def.rest ? process$1(def.rest, ctx, {
		...params,
		path: [
			...params.path,
			restPath,
			...ctx.target === "openapi-3.0" ? [def.items.length] : []
		]
	}) : null;
	if (ctx.target === "draft-2020-12") {
		json.prefixItems = prefixItems;
		if (rest) json.items = rest;
	} else if (ctx.target === "openapi-3.0") {
		json.items = { anyOf: prefixItems };
		if (rest) json.items.anyOf.push(rest);
		json.minItems = prefixItems.length;
		if (!rest) json.maxItems = prefixItems.length;
	} else {
		json.items = prefixItems;
		if (rest) json.additionalItems = rest;
	}
	const { minimum, maximum } = schema._zod.bag;
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
};
const recordProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	const keyType = def.keyType;
	const patterns = keyType._zod.bag?.patterns;
	if (def.mode === "loose" && patterns && patterns.size > 0) {
		const valueSchema = process$1(def.valueType, ctx, {
			...params,
			path: [
				...params.path,
				"patternProperties",
				"*"
			]
		});
		json.patternProperties = {};
		for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
	} else {
		if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process$1(def.keyType, ctx, {
			...params,
			path: [...params.path, "propertyNames"]
		});
		json.additionalProperties = process$1(def.valueType, ctx, {
			...params,
			path: [...params.path, "additionalProperties"]
		});
	}
	const keyValues = keyType._zod.values;
	if (keyValues) {
		const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
		if (validKeyValues.length > 0) json.required = validKeyValues;
	}
};
const nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		throw new Error("Dynamic catch values are not supported in JSON Schema");
	}
	json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
	process$1(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
const promiseProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process$1(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const lazyProcessor = (schema, ctx, _json, params) => {
	const innerType = schema._zod.innerType;
	process$1(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const allProcessors = {
	string: stringProcessor,
	number: numberProcessor,
	boolean: booleanProcessor,
	bigint: bigintProcessor,
	symbol: symbolProcessor,
	null: nullProcessor,
	undefined: undefinedProcessor,
	void: voidProcessor,
	never: neverProcessor,
	any: anyProcessor,
	unknown: unknownProcessor,
	date: dateProcessor,
	enum: enumProcessor,
	literal: literalProcessor,
	nan: nanProcessor,
	template_literal: templateLiteralProcessor,
	file: fileProcessor,
	success: successProcessor,
	custom: customProcessor,
	function: functionProcessor,
	transform: transformProcessor,
	map: mapProcessor,
	set: setProcessor,
	array: arrayProcessor,
	object: objectProcessor,
	union: unionProcessor,
	intersection: intersectionProcessor,
	tuple: tupleProcessor,
	record: recordProcessor,
	nullable: nullableProcessor,
	nonoptional: nonoptionalProcessor,
	default: defaultProcessor,
	prefault: prefaultProcessor,
	catch: catchProcessor,
	pipe: pipeProcessor,
	readonly: readonlyProcessor,
	promise: promiseProcessor,
	optional: optionalProcessor,
	lazy: lazyProcessor
};
function toJSONSchema(input, params) {
	if ("_idmap" in input) {
		const registry = input;
		const ctx = initializeContext({
			...params,
			processors: allProcessors
		});
		const defs = {};
		for (const entry of registry._idmap.entries()) {
			const [_, schema] = entry;
			process$1(schema, ctx);
		}
		const schemas = {};
		ctx.external = {
			registry,
			uri: params?.uri,
			defs
		};
		for (const entry of registry._idmap.entries()) {
			const [key, schema] = entry;
			extractDefs(ctx, schema);
			schemas[key] = finalize(ctx, schema);
		}
		if (Object.keys(defs).length > 0) schemas.__shared = { [ctx.target === "draft-2020-12" ? "$defs" : "definitions"]: defs };
		return { schemas };
	}
	const ctx = initializeContext({
		...params,
		processors: allProcessors
	});
	process$1(input, ctx);
	extractDefs(ctx, input);
	return finalize(ctx, input);
}

//#endregion
//#region node_modules/zod/v4/classic/iso.js
const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date(params) {
	return _isoDate(ZodISODate, params);
}
const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return _isoTime(ZodISOTime, params);
}
const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return _isoDuration(ZodISODuration, params);
}

//#endregion
//#region node_modules/zod/v4/classic/errors.js
const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue) => {
			inst.issues.push(issue);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues) => {
			inst.issues.push(...issues);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
const ZodError = $constructor("ZodError", initializer);
const ZodRealError = $constructor("ZodError", initializer, { Parent: Error });

//#endregion
//#region node_modules/zod/v4/classic/parse.js
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

//#endregion
//#region node_modules/zod/v4/classic/schemas.js
const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	Object.assign(inst["~standard"], { jsonSchema: {
		input: createStandardJSONSchemaMethod(inst, "input"),
		output: createStandardJSONSchemaMethod(inst, "output")
	} });
	inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
	inst.def = def;
	inst.type = def.type;
	Object.defineProperty(inst, "_def", { value: def });
	inst.check = (...checks) => {
		return inst.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...checks.map((ch) => typeof ch === "function" ? { _zod: {
			check: ch,
			def: { check: "custom" },
			onattach: []
		} } : ch)] }), { parent: true });
	};
	inst.with = inst.check;
	inst.clone = (def, params) => clone(inst, def, params);
	inst.brand = () => inst;
	inst.register = ((reg, meta) => {
		reg.add(inst, meta);
		return inst;
	});
	inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.encode = (data, params) => encode(inst, data, params);
	inst.decode = (data, params) => decode(inst, data, params);
	inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
	inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
	inst.safeEncode = (data, params) => safeEncode(inst, data, params);
	inst.safeDecode = (data, params) => safeDecode(inst, data, params);
	inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
	inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
	inst.refine = (check, params) => inst.check(refine(check, params));
	inst.superRefine = (refinement) => inst.check(superRefine(refinement));
	inst.overwrite = (fn) => inst.check(_overwrite(fn));
	inst.optional = () => optional(inst);
	inst.exactOptional = () => exactOptional(inst);
	inst.nullable = () => nullable(inst);
	inst.nullish = () => optional(nullable(inst));
	inst.nonoptional = (params) => nonoptional(inst, params);
	inst.array = () => array(inst);
	inst.or = (arg) => union([inst, arg]);
	inst.and = (arg) => intersection(inst, arg);
	inst.transform = (tx) => pipe(inst, transform(tx));
	inst.default = (def) => _default$1(inst, def);
	inst.prefault = (def) => prefault(inst, def);
	inst.catch = (params) => _catch(inst, params);
	inst.pipe = (target) => pipe(inst, target);
	inst.readonly = () => readonly(inst);
	inst.describe = (description) => {
		const cl = inst.clone();
		globalRegistry.add(cl, { description });
		return cl;
	};
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	inst.meta = (...args) => {
		if (args.length === 0) return globalRegistry.get(inst);
		const cl = inst.clone();
		globalRegistry.add(cl, args[0]);
		return cl;
	};
	inst.isOptional = () => inst.safeParse(void 0).success;
	inst.isNullable = () => inst.safeParse(null).success;
	inst.apply = (fn) => fn(inst);
	return inst;
});
/** @internal */
const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	inst.regex = (...args) => inst.check(_regex(...args));
	inst.includes = (...args) => inst.check(_includes(...args));
	inst.startsWith = (...args) => inst.check(_startsWith(...args));
	inst.endsWith = (...args) => inst.check(_endsWith(...args));
	inst.min = (...args) => inst.check(_minLength(...args));
	inst.max = (...args) => inst.check(_maxLength(...args));
	inst.length = (...args) => inst.check(_length(...args));
	inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
	inst.lowercase = (params) => inst.check(_lowercase(params));
	inst.uppercase = (params) => inst.check(_uppercase(params));
	inst.trim = () => inst.check(_trim());
	inst.normalize = (...args) => inst.check(_normalize(...args));
	inst.toLowerCase = () => inst.check(_toLowerCase());
	inst.toUpperCase = () => inst.check(_toUpperCase());
	inst.slugify = () => inst.check(_slugify());
});
const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(_email(ZodEmail, params));
	inst.url = (params) => inst.check(_url(ZodURL, params));
	inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(_emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(_xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(_e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
	return _string(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	inst.gt = (value, params) => inst.check(_gt(value, params));
	inst.gte = (value, params) => inst.check(_gte(value, params));
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.lt = (value, params) => inst.check(_lt(value, params));
	inst.lte = (value, params) => inst.check(_lte(value, params));
	inst.max = (value, params) => inst.check(_lte(value, params));
	inst.int = (params) => inst.check(int$1(params));
	inst.safe = (params) => inst.check(int$1(params));
	inst.positive = (params) => inst.check(_gt(0, params));
	inst.nonnegative = (params) => inst.check(_gte(0, params));
	inst.negative = (params) => inst.check(_lt(0, params));
	inst.nonpositive = (params) => inst.check(_lte(0, params));
	inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
	inst.step = (value, params) => inst.check(_multipleOf(value, params));
	inst.finite = () => inst;
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number(params) {
	return _number(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int$1(params) {
	return _int(ZodNumberFormat, params);
}
const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
	return _boolean(ZodBoolean, params);
}
const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
	return _unknown(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return _never(ZodNever, params);
}
const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
	inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
	inst.nonempty = (params) => inst.check(_minLength(1, params));
	inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
	inst.length = (len, params) => inst.check(_length(len, params));
	inst.unwrap = () => inst.element;
});
function array(element, params) {
	return _array(ZodArray, element, params);
}
const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	defineLazy(inst, "shape", () => {
		return def.shape;
	});
	inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
	inst.catchall = (catchall) => inst.clone({
		...inst._zod.def,
		catchall
	});
	inst.passthrough = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.loose = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.strict = () => inst.clone({
		...inst._zod.def,
		catchall: never()
	});
	inst.strip = () => inst.clone({
		...inst._zod.def,
		catchall: void 0
	});
	inst.extend = (incoming) => {
		return extend(inst, incoming);
	};
	inst.safeExtend = (incoming) => {
		return safeExtend(inst, incoming);
	};
	inst.merge = (other) => merge$1(inst, other);
	inst.pick = (mask) => pick(inst, mask);
	inst.omit = (mask) => omit(inst, mask);
	inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
	inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
	const def = {
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	};
	return new ZodObject(def);
}
const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
	ZodUnion.init(inst, def);
	$ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
	return new ZodDiscriminatedUnion({
		type: "union",
		options,
		discriminator,
		...normalizeParams(params)
	});
}
const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
	return new ZodEnum({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			return payload;
		});
		payload.value = output;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default$1(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
	return _superRefine(fn);
}

//#endregion
//#region node_modules/zod/v4/classic/compat.js
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
const ZodIssueCode = {
	invalid_type: "invalid_type",
	too_big: "too_big",
	too_small: "too_small",
	invalid_format: "invalid_format",
	not_multiple_of: "not_multiple_of",
	unrecognized_keys: "unrecognized_keys",
	invalid_union: "invalid_union",
	invalid_key: "invalid_key",
	invalid_element: "invalid_element",
	invalid_value: "invalid_value",
	custom: "custom"
};
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
var ZodFirstPartyTypeKind;
ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {});

//#endregion
//#region src/shim/tool-registry.ts
const _registered = [];
function registerTool(ctor) {
	_registered.push(ctor);
}
function getRegisteredTools() {
	return _registered;
}

//#endregion
//#region src/shim/input-schema.ts
/**
* Same JSON Schema rendering rule agent-core-v2 uses for tool parameters
* (`io: 'input'`, closed objects) — duplicated here so the ported brewing
* tools compile unchanged outside the agent-core-v2 workspace.
*/
function toInputJsonSchema(schema) {
	const jsonSchema = toJSONSchema(schema, {
		target: "draft-7",
		io: "input"
	});
	closeObjectNodes(jsonSchema);
	if ((jsonSchema["oneOf"] !== void 0 || jsonSchema["anyOf"] !== void 0) && jsonSchema["type"] === void 0) jsonSchema["type"] = "object";
	return jsonSchema;
}
function closeObjectNodes(value) {
	if (Array.isArray(value)) {
		for (const item of value) closeObjectNodes(item);
		return;
	}
	if (typeof value !== "object" || value === null) return;
	const node = value;
	if (node["type"] === "object" && node["additionalProperties"] === void 0) node["additionalProperties"] = false;
	for (const child of Object.values(node)) closeObjectNodes(child);
}

//#endregion
//#region src/brewing/brewing-calculator.ts
/**
* Brewing calculator — complete brewing math engine.
*
* Single coherent volume chain (packaged → fermenter → cold post-boil →
* hot post-boil → pre-boil → mash/sparge) plus ABV, attenuation, efficiency,
* strike water, pitching rate, gravity correction, dilution, and boil-off.
*/
const MALT_POTENTIAL = {
	"pilsner malt": 307,
	"maris otter": 300,
	"pale ale malt": 307,
	"munich malt": 290,
	"vienna malt": 300,
	"wheat malt": 315,
	"crystal malt 60l": 270,
	"crystal malt 120l": 260,
	"chocolate malt": 230,
	"black patent": 220,
	"roasted barley": 210,
	"flaked oats": 275,
	"flaked wheat": 300,
	"flaked barley": 285,
	"fiocchi d'orzo": 285,
	"fiocchi d'avena": 275,
	"fiocchi di frumento": 300,
	"corn (flaked)": 320,
	"rice (flaked)": 320,
	"caramunich": 285,
	"caramunich malt": 285,
	"caramel 300": 250,
	"caramel 300 malt": 250,
	"carafa special iii": 220,
	"carafa special iii malt": 220,
	"carafa speciale iii": 220,
	"carapils": 280,
	"carapils malt": 280,
	"caravienne": 285,
	"caravienne malt": 285,
	"carared": 275,
	"carared malt": 275,
	"carahell": 290,
	"carahell malt": 290
};
const DEFAULT_RATES = {
	ale: .75,
	hybrid: 1,
	lager: 1.5
};
const SUCROSE_YIELD = 384;
const BrewingCalculatorInputSchema = object({
	calculation: _enum([
		"abv",
		"attenuation",
		"efficiency",
		"strike_water",
		"mash_water_volume",
		"sparge_water_volume",
		"total_water_volume",
		"pre_boil_volume",
		"post_boil_volume",
		"pitching_rate",
		"gravity_correction",
		"dilution",
		"boil_off"
	]),
	og: number().min(.99).max(1.3).optional(),
	fg: number().min(.99).max(1.2).optional(),
	batch_size_liters: number().positive().max(200).optional().describe("Target packaged beer volume in liters."),
	grain_bill_kg: array(object({
		malt: string().min(1),
		kg: number().positive()
	})).optional(),
	grain_bill: array(object({
		malt: string().min(1),
		kg: number().positive()
	})).optional(),
	measured_gravity: number().min(.99).max(1.3).optional(),
	mash_temp_c: number().min(35).max(80).optional(),
	grain_temp_c: number().min(-10).max(45).optional(),
	mash_thickness_l_per_kg: number().min(1.5).max(10).optional(),
	mash_deadspace_liters: number().min(0).max(30).optional().describe("Volume under the basket/false bottom in liters (default 0)."),
	mash_loss_liters: number().min(0).max(20).optional().describe("Non-recoverable mash loss in liters (default 0)."),
	grain_absorption_l_per_kg: number().min(.3).max(1.5).optional().describe("Grain absorption in L/kg (default 0.8)."),
	sparge_water_volume: number().nonnegative().max(200).optional().describe("User-provided sparge water volume in liters. When given, it overrides the calculated sparge volume for total_water_volume."),
	boil_duration_minutes: number().min(0).max(300).optional(),
	boil_off_rate_l_per_h: number().min(0).max(20).optional(),
	trub_loss_liters: number().min(0).max(30).optional().describe("Trub/kettle loss in liters (default 1.5)."),
	fermenter_loss_liters: number().min(0).max(30).optional().describe("Fermenter-to-package loss in liters (default 0.5)."),
	wort_shrinkage_percent: number().min(0).max(10).optional().describe("Wort shrinkage from hot to cold (default 4%)."),
	beer_type: _enum([
		"ale",
		"lager",
		"hybrid"
	]).optional(),
	cells_per_ml_p_required: number().min(.1).max(5).optional(),
	yeast_viability_percent: number().gt(0).max(100).optional(),
	volume_liters: number().optional(),
	current_gravity: number().optional(),
	target_gravity: number().optional()
});
var BrewingCalculatorTool = class {
	name = "brewing_calculator";
	description = "Calculate brewing parameters: ABV, attenuation, efficiency, strike water, mash/sparge/total water, pre/post-boil volumes, pitching rates, gravity corrections, dilution, and boil-off. For total_water_volume you can optionally pass sparge_water_volume (in liters) to override the calculated sparge volume.";
	parameters = toInputJsonSchema(BrewingCalculatorInputSchema);
	resolveExecution(args) {
		return {
			description: `Brewing calculation: ${args.calculation}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			switch (args.calculation) {
				case "abv": return Promise.resolve(this.calcAbv(args));
				case "attenuation": return Promise.resolve(this.calcAttenuation(args));
				case "efficiency": return Promise.resolve(this.calcEfficiency(args));
				case "strike_water": return Promise.resolve(this.calcStrikeWater(args));
				case "mash_water_volume": return Promise.resolve(this.calcMashWaterVolume(args));
				case "sparge_water_volume": return Promise.resolve(this.calcSpargeWaterVolume(args));
				case "total_water_volume": return Promise.resolve(this.calcTotalWaterVolume(args));
				case "pre_boil_volume": return Promise.resolve(this.calcPreBoilVolume(args));
				case "post_boil_volume": return Promise.resolve(this.calcPostBoilVolume(args));
				case "pitching_rate": return Promise.resolve(this.calcPitchingRate(args));
				case "gravity_correction": return Promise.resolve(this.calcGravityCorrection(args));
				case "dilution": return Promise.resolve(this.calcDilution(args));
				case "boil_off": return Promise.resolve(this.calcBoilOff(args));
			}
		} catch (error) {
			return Promise.resolve({
				isError: true,
				output: error instanceof Error ? error.message : String(error)
			});
		}
	}
	waterParameters(args) {
		return {
			packagedLiters: args.batch_size_liters ?? 0,
			grainKg: this.sumKg(args.grain_bill_kg ?? args.grain_bill),
			mashThickness: args.mash_thickness_l_per_kg ?? 3,
			mashDeadspace: args.mash_deadspace_liters ?? 0,
			mashLoss: args.mash_loss_liters ?? 0,
			grainAbsorption: args.grain_absorption_l_per_kg ?? .8,
			boilMinutes: args.boil_duration_minutes ?? 60,
			boilOffRate: args.boil_off_rate_l_per_h ?? 3,
			trubLoss: args.trub_loss_liters ?? 1.5,
			fermenterLoss: args.fermenter_loss_liters ?? .5,
			shrinkageFraction: (args.wort_shrinkage_percent ?? 4) / 100
		};
	}
	boilOffL(args) {
		const p = this.waterParameters(args);
		return p.boilOffRate * p.boilMinutes / 60;
	}
	fermenterTargetL(args) {
		const p = this.waterParameters(args);
		return p.packagedLiters + p.fermenterLoss;
	}
	coldPostBoilL(args) {
		const p = this.waterParameters(args);
		return this.fermenterTargetL(args) + p.trubLoss;
	}
	hotPostBoilL(args) {
		const p = this.waterParameters(args);
		return this.coldPostBoilL(args) / (1 - p.shrinkageFraction);
	}
	preBoilL(args) {
		return this.hotPostBoilL(args) + this.boilOffL(args);
	}
	mashWaterL(args) {
		const p = this.waterParameters(args);
		if (p.grainKg <= 0) return 0;
		return p.grainKg * p.mashThickness + p.mashDeadspace;
	}
	firstRunningsL(args) {
		const p = this.waterParameters(args);
		const mw = this.mashWaterL(args);
		return Math.max(0, mw - p.grainKg * p.grainAbsorption - p.mashLoss);
	}
	spargeWaterL(args) {
		if (args.sparge_water_volume !== void 0) return args.sparge_water_volume;
		return Math.max(0, this.preBoilL(args) - this.firstRunningsL(args));
	}
	totalWaterL(args) {
		return this.mashWaterL(args) + this.spargeWaterL(args);
	}
	calcAbv(args) {
		const og = this.req(args.og, "og");
		const fg = this.req(args.fg, "fg");
		if (og <= fg) return {
			isError: true,
			output: "OG must be greater than FG."
		};
		return { output: `ABV = (OG ${og.toFixed(3)} − FG ${fg.toFixed(3)}) × 131.25 = **${((og - fg) * 131.25).toFixed(2)}% vol**` };
	}
	calcAttenuation(args) {
		const og = this.req(args.og, "og");
		const fg = this.req(args.fg, "fg");
		if (og <= fg) return {
			isError: true,
			output: "OG must be greater than FG."
		};
		return { output: `Attenuazione apparente = **${((og - fg) / (og - 1) * 100).toFixed(1)}%**` };
	}
	calcEfficiency(args) {
		const batchLiters = this.req(args.batch_size_liters, "batch_size_liters");
		const measuredGrav = this.req(args.measured_gravity, "measured_gravity");
		const grainBill = this.req(args.grain_bill_kg ?? args.grain_bill, "grain_bill");
		let theoreticalPtL = 0;
		for (const { malt, kg } of grainBill) {
			const key = malt.toLowerCase();
			const pot = MALT_POTENTIAL[key] ?? MALT_POTENTIAL[key + " malt"] ?? this.lookupPotential(key);
			if (pot === void 0) return {
				isError: true,
				output: `Potenziale sconosciuto per "${malt}".`
			};
			theoreticalPtL += kg * pot;
		}
		const measuredPtL = (measuredGrav - 1) * 1e3 * batchLiters;
		return { output: [
			`Efficienza = **${(measuredPtL / theoreticalPtL * 100).toFixed(1)}%**`,
			`  Punti teorici: ${theoreticalPtL.toFixed(0)} punti·L`,
			`  Punti misurati: ${measuredPtL.toFixed(0)} punti·L`
		].join("\n") };
	}
	calcStrikeWater(args) {
		const mashTemp = this.req(args.mash_temp_c, "mash_temp_c");
		const grainTemp = this.req(args.grain_temp_c, "grain_temp_c");
		const thickness = args.mash_thickness_l_per_kg ?? 3;
		return { output: `Temperatura strike water = **${(mashTemp + .41 / thickness * (mashTemp - grainTemp)).toFixed(1)}°C** (${thickness} L/kg, mash target ${mashTemp}°C, grani ${grainTemp}°C)` };
	}
	calcMashWaterVolume(args) {
		const p = this.waterParameters(args);
		if (p.grainKg <= 0) return {
			isError: true,
			output: "grain_bill required."
		};
		const grainWater = p.grainKg * p.mashThickness;
		const totalMash = grainWater + p.mashDeadspace;
		return { output: [
			`Acqua nel letto di trebbie: **${grainWater.toFixed(1)} L** (${p.mashThickness} L/kg × ${p.grainKg.toFixed(2)} kg)`,
			p.mashDeadspace > 0 ? `Spazio sotto cestello: +${p.mashDeadspace.toFixed(1)} L` : "",
			`Acqua totale da caricare per il mash: **${totalMash.toFixed(1)} L**`
		].filter(Boolean).join("\n") };
	}
	calcSpargeWaterVolume(args) {
		const p = this.waterParameters(args);
		if (p.grainKg <= 0) return {
			isError: true,
			output: "grain_bill required."
		};
		const mw = this.mashWaterL(args);
		const fr = this.firstRunningsL(args);
		const sparge = this.spargeWaterL(args);
		const preBoil = this.preBoilL(args);
		if (args.sparge_water_volume !== void 0) return { output: [
			`Acqua di sparge = **${sparge.toFixed(1)} L** (fornita dall'utente)`,
			`  Acqua di mash: ${mw.toFixed(1)} L`,
			`  Primi mosti: ${fr.toFixed(1)} L`,
			`  Pre-boil risultante: ${(mw + sparge - p.grainKg * p.grainAbsorption - p.mashLoss).toFixed(1)} L`
		].join("\n") };
		return { output: [
			`Acqua di sparge = **${sparge.toFixed(1)} L**`,
			`  Acqua di mash: ${mw.toFixed(1)} L`,
			`  Assorbimento grani: ${(p.grainKg * p.grainAbsorption).toFixed(1)} L (${p.grainAbsorption} L/kg)`,
			`  Primi mosti: ${fr.toFixed(1)} L`,
			`  Pre-boil richiesto: ${preBoil.toFixed(1)} L`
		].join("\n") };
	}
	calcTotalWaterVolume(args) {
		const p = this.waterParameters(args);
		const mash = this.mashWaterL(args);
		const sparge = this.spargeWaterL(args);
		const preBoil = this.preBoilL(args);
		const absorbed = p.grainKg * p.grainAbsorption;
		if (args.sparge_water_volume !== void 0) return { output: [
			`Acqua di mash: ${mash.toFixed(1)} L`,
			`Acqua di sparge: ${sparge.toFixed(1)} L (fornita dall'utente)`,
			`Acqua totale di processo: **${(mash + sparge).toFixed(1)} L**`,
			`  (Pre-boil calcolato: ${preBoil.toFixed(1)} L + assorbimento: ${absorbed.toFixed(1)} L)`
		].join("\n") };
		return { output: [
			`Acqua di mash: ${mash.toFixed(1)} L`,
			`Acqua di sparge: ${sparge.toFixed(1)} L`,
			`Acqua totale di processo: **${(mash + sparge).toFixed(1)} L**`,
			`  (Pre-boil: ${preBoil.toFixed(1)} L + assorbimento: ${absorbed.toFixed(1)} L)`
		].join("\n") };
	}
	calcPreBoilVolume(args) {
		const p = this.waterParameters(args);
		const hot = this.hotPostBoilL(args);
		const boilOff = this.boilOffL(args);
		const preBoil = this.preBoilL(args);
		return { output: [
			`Post-boil caldo: ${hot.toFixed(1)} L`,
			`Evaporazione: ${boilOff.toFixed(1)} L (${p.boilOffRate} L/h × ${p.boilMinutes} min)`,
			`Volume pre-boil: **${preBoil.toFixed(1)} L**`
		].join("\n") };
	}
	calcPostBoilVolume(args) {
		const p = this.waterParameters(args);
		const ferm = this.fermenterTargetL(args);
		const cold = this.coldPostBoilL(args);
		const hot = this.hotPostBoilL(args);
		return { output: [
			`Volume confezionato target: ${p.packagedLiters.toFixed(1)} L`,
			`Richiesto nel fermentatore: ${ferm.toFixed(1)} L (+${p.fermenterLoss} L)`,
			`Post-boil freddo nel kettle: ${cold.toFixed(1)} L (+${p.trubLoss} L)`,
			`Post-boil caldo: **${hot.toFixed(1)} L** (contrazione ${(p.shrinkageFraction * 100).toFixed(1)}%)`
		].join("\n") };
	}
	calcPitchingRate(args) {
		const batchLiters = this.req(args.batch_size_liters, "batch_size_liters");
		const og = this.req(args.og, "og");
		const beerType = args.beer_type ?? "ale";
		const cells = args.cells_per_ml_p_required ?? DEFAULT_RATES[beerType] ?? .75;
		const plato = this.toPlato(og);
		const viability = args.yeast_viability_percent ?? 95;
		const requiredBillions = batchLiters * plato * cells;
		const pitchBillions = requiredBillions / (viability / 100);
		return { output: [
			`Pitching rate: ${cells.toFixed(2)} M cellule/mL/°P (${beerType})`,
			`Mosto: ${batchLiters.toFixed(1)} L a ${plato.toFixed(1)}°P`,
			`Cellule vitali: **${requiredBillions.toFixed(0)} miliardi**`,
			`Cella nominali viabilità ${viability}%: **${pitchBillions.toFixed(0)} miliardi**`
		].join("\n") };
	}
	calcGravityCorrection(args) {
		const current = this.req(args.current_gravity, "current_gravity");
		const target = this.req(args.target_gravity, "target_gravity");
		const volume = this.req(args.volume_liters, "volume_liters");
		if (target <= current) return {
			isError: true,
			output: "Target gravity must be > current gravity."
		};
		const missingPtL = (target - current) * 1e3 * volume;
		return { output: [
			`Correzione OG: aggiungi **${(missingPtL / SUCROSE_YIELD * 1e3).toFixed(0)} g** di saccarosio`,
			`  Da ${current.toFixed(3)} a ${target.toFixed(3)} — ${volume.toFixed(1)} L`,
			`  Punti mancanti: ${missingPtL.toFixed(0)} punti·L`
		].join("\n") };
	}
	calcDilution(args) {
		const volume = this.req(args.volume_liters, "volume_liters");
		const curr = this.req(args.current_gravity, "current_gravity");
		const target = this.req(args.target_gravity, "target_gravity");
		if (curr <= target) return {
			isError: true,
			output: "Current gravity must be > target."
		};
		const dilution = volume * ((curr - 1) / (target - 1) - 1);
		return { output: `Aggiungi **${dilution.toFixed(1)} L** di acqua per diluire da ${curr.toFixed(3)} a ${target.toFixed(3)} (volume finale: ${(volume + dilution).toFixed(1)} L)` };
	}
	calcBoilOff(args) {
		const p = this.waterParameters(args);
		const evaporated = this.boilOffL(args);
		const preBoil = this.preBoilL(args);
		const percent = preBoil > 0 ? evaporated / preBoil * 100 : 0;
		return { output: [
			`Evaporazione: **${evaporated.toFixed(1)} L** (${percent.toFixed(1)}%)`,
			`  Tasso: ${p.boilOffRate} L/h, durata: ${p.boilMinutes} min`,
			`  Pre-boil: ${preBoil.toFixed(1)} L → post-boil caldo: ${(preBoil - evaporated).toFixed(1)} L`
		].join("\n") };
	}
	sumKg(bill) {
		if (!bill) return 0;
		let t = 0;
		for (const g of bill) t += g.kg;
		return t;
	}
	/** Fuzzy match a malt name against known potentials. */
	lookupPotential(name) {
		const n = name.toLowerCase().replace(/ malt$/, "").replace(/^-/, "");
		for (const [key, val] of Object.entries(MALT_POTENTIAL)) {
			const k = key.replace(/ malt$/, "");
			if (k === n || key.includes(n) || n.includes(k)) return val;
		}
	}
	req(v, name) {
		if (v == null) throw new Error(`Missing: ${name}`);
		return v;
	}
	toPlato(sg) {
		return -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;
	}
};
registerTool(BrewingCalculatorTool);

//#endregion
//#region src/brewing/water-profile-calculator.ts
/**
* Water profile calculator — adjust mineral additions for any beer style.
*/
const SALT = {
	gypsum: {
		ca: 232.8,
		mg: 0,
		na: 0,
		cl: 0,
		so4: 557.9,
		hco3: 0,
		label: "Gesso (CaSO₄·2H₂O)"
	},
	cacl2: {
		ca: 272.6,
		mg: 0,
		na: 0,
		cl: 482.3,
		so4: 0,
		hco3: 0,
		label: "CaCl₂·2H₂O"
	},
	epsom: {
		ca: 0,
		mg: 98.6,
		na: 0,
		cl: 0,
		so4: 389.8,
		hco3: 0,
		label: "Epsom (MgSO₄·7H₂O)"
	},
	nahco3: {
		ca: 0,
		mg: 0,
		na: 273.7,
		cl: 0,
		so4: 0,
		hco3: 726.3,
		label: "NaHCO₃"
	}
};
const WaterProfileCalculatorInputSchema = object({
	source_water: object({
		ca: number(),
		mg: number(),
		na: number(),
		cl: number(),
		so4: number(),
		hco3: number()
	}),
	target_profile: _enum([
		"pilsner",
		"helles",
		"dortmunder",
		"vienna",
		"marzen",
		"bock",
		"doppelbock",
		"dunkel",
		"schwarzbier",
		"kolsch",
		"altbier",
		"weissbier",
		"dunkelweizen",
		"berliner_weisse",
		"gose",
		"lambic",
		"saison",
		"belgian_pale",
		"belgian_dubbel",
		"belgian_tripel",
		"belgian_golden_strong",
		"belgian_dark_strong",
		"witbier",
		"biere_de_garde",
		"british_pale",
		"british_ipa",
		"british_stout",
		"porter",
		"mild",
		"bitter",
		"esb",
		"barleywine",
		"old_ale",
		"scotch_ale",
		"american_pale",
		"american_ipa",
		"double_ipa",
		"american_stout",
		"imperial_stout",
		"neipa",
		"cream_ale",
		"blonde_ale",
		"california_common",
		"american_lager",
		"light_lager",
		"premium_lager",
		"amber_lager",
		"dark_lager",
		"baltic_porter",
		"rauchbier",
		"roggenbier",
		"dampfbier",
		"fruit_beer",
		"spice_beer",
		"wood_aged",
		"sour_ale",
		"brett_beer",
		"mixed_fermentation",
		"kveik_ale",
		"brut_ipa",
		"session_ipa",
		"wheat_ipa",
		"black_ipa",
		"red_ipa",
		"white_ipa",
		"belgian_ipa",
		"new_england_ipa",
		"milk_stout",
		"oatmeal_stout",
		"dry_stout",
		"foreign_extra_stout",
		"american_porter",
		"brown_ale",
		"amber_ale",
		"red_ale",
		"irish_red",
		"scottish_light",
		"scottish_heavy",
		"scottish_export",
		"wee_heavy",
		"english_ipa",
		"strong_bitter",
		"brown_porter",
		"robust_porter",
		"imperial_stout_ris",
		"flanders_red",
		"flanders_brown",
		"oud_bruin",
		"lambic_gueuze",
		"lambic_kriek",
		"lambic_framboise"
	]),
	batch_size_liters: number().optional().describe("IGNORATO — usa mash_water_liters e/o sparge_water_liters. Questo campo è conservato per compatibilità ma non viene usato nei calcoli."),
	mash_water_liters: number().positive().optional().describe("Volume acqua di ammostamento in litri. Se omesso, calcolato automaticamente da grain_kg + mash_ratio_l_per_kg + dead_space_l."),
	sparge_water_liters: number().nonnegative().optional().describe("Volume acqua di sparge in litri. Se omesso, calcolato automaticamente da pre_boil_target_l + grain_kg × grain_absorption_l_per_kg − mash_water_liters."),
	grain_kg: number().positive().optional().describe("Peso totale dei grani in kg. Necessario per il calcolo automatico dei volumi di mash e sparge."),
	mash_ratio_l_per_kg: number().positive().optional().describe("Rapporto acqua/malto in L/kg. Default: 3.0."),
	dead_space_l: number().nonnegative().optional().describe("Spazio morto sotto/intorno al cestello in litri (es. BrewZilla Gen 3.1.1: ~6.5 L, Gen 4: ~5–6 L). Default: 6.5."),
	grain_absorption_l_per_kg: number().positive().optional().describe("Assorbimento delle trebbie in L/kg. Default: 0.9 (range tipico 0.8–0.95 per sistemi single-vessel)."),
	pre_boil_target_l: number().positive().optional().describe("Volume pre-boil target in litri. Se omesso, calcolato da fermenter_target_l + boil_off_l_per_hour × boil_duration_h + trub_loss_l."),
	fermenter_target_l: number().positive().optional().describe("Volume target nel fermentatore in litri (es. 20–23 L). Usato per calcolare automaticamente il pre-boil."),
	boil_off_l_per_hour: number().nonnegative().optional().describe("Tasso di evaporazione in L/h. Default: 3.0. Misuralo sul tuo impianto."),
	boil_duration_h: number().positive().optional().describe("Durata bollitura in ore. Default: 1.0."),
	trub_loss_l: number().nonnegative().optional().describe("Perdite di trub e trasferimento in litri. Default: 2.0."),
	target_ph: number().optional()
});
const WATER = {
	pilsner: {
		ca: 10,
		mg: 2,
		na: 2,
		cl: 5,
		so4: 5,
		hco3: 15,
		desc: "Pilsen — very soft"
	},
	helles: {
		ca: 50,
		mg: 10,
		na: 5,
		cl: 60,
		so4: 15,
		hco3: 50,
		desc: "Munich Helles"
	},
	dortmunder: {
		ca: 250,
		mg: 25,
		na: 70,
		cl: 100,
		so4: 300,
		hco3: 550,
		desc: "Dortmund"
	},
	vienna: {
		ca: 200,
		mg: 60,
		na: 8,
		cl: 12,
		so4: 125,
		hco3: 120,
		desc: "Vienna"
	},
	marzen: {
		ca: 150,
		mg: 40,
		na: 10,
		cl: 60,
		so4: 80,
		hco3: 200,
		desc: "Märzen"
	},
	bock: {
		ca: 100,
		mg: 30,
		na: 15,
		cl: 80,
		so4: 40,
		hco3: 250,
		desc: "Bock"
	},
	doppelbock: {
		ca: 80,
		mg: 25,
		na: 10,
		cl: 70,
		so4: 30,
		hco3: 200,
		desc: "Doppelbock"
	},
	dunkel: {
		ca: 120,
		mg: 35,
		na: 12,
		cl: 90,
		so4: 50,
		hco3: 300,
		desc: "Dunkel"
	},
	schwarzbier: {
		ca: 100,
		mg: 30,
		na: 10,
		cl: 70,
		so4: 40,
		hco3: 250,
		desc: "Schwarzbier"
	},
	kolsch: {
		ca: 80,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 40,
		hco3: 150,
		desc: "Kölsch"
	},
	altbier: {
		ca: 150,
		mg: 30,
		na: 25,
		cl: 80,
		so4: 100,
		hco3: 200,
		desc: "Altbier"
	},
	weissbier: {
		ca: 50,
		mg: 15,
		na: 10,
		cl: 40,
		so4: 20,
		hco3: 100,
		desc: "Weissbier"
	},
	dunkelweizen: {
		ca: 60,
		mg: 20,
		na: 12,
		cl: 50,
		so4: 25,
		hco3: 150,
		desc: "Dunkelweizen"
	},
	berliner_weisse: {
		ca: 50,
		mg: 10,
		na: 10,
		cl: 40,
		so4: 20,
		hco3: 100,
		desc: "Berliner Weisse"
	},
	gose: {
		ca: 80,
		mg: 20,
		na: 50,
		cl: 100,
		so4: 40,
		hco3: 150,
		desc: "Gose"
	},
	lambic: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 200,
		desc: "Lambic"
	},
	saison: {
		ca: 100,
		mg: 20,
		na: 15,
		cl: 50,
		so4: 80,
		hco3: 100,
		desc: "Saison"
	},
	belgian_pale: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 50,
		hco3: 150,
		desc: "Belgian Pale"
	},
	belgian_dubbel: {
		ca: 60,
		mg: 20,
		na: 15,
		cl: 70,
		so4: 30,
		hco3: 200,
		desc: "Belgian Dubbel"
	},
	belgian_tripel: {
		ca: 80,
		mg: 25,
		na: 15,
		cl: 60,
		so4: 40,
		hco3: 150,
		desc: "Belgian Tripel"
	},
	belgian_golden_strong: {
		ca: 70,
		mg: 20,
		na: 12,
		cl: 55,
		so4: 35,
		hco3: 120,
		desc: "Belgian Golden Strong"
	},
	belgian_dark_strong: {
		ca: 60,
		mg: 20,
		na: 15,
		cl: 65,
		so4: 30,
		hco3: 200,
		desc: "Belgian Dark Strong"
	},
	witbier: {
		ca: 50,
		mg: 15,
		na: 10,
		cl: 40,
		so4: 20,
		hco3: 100,
		desc: "Witbier"
	},
	biere_de_garde: {
		ca: 100,
		mg: 25,
		na: 15,
		cl: 60,
		so4: 50,
		hco3: 150,
		desc: "Bière de Garde"
	},
	british_pale: {
		ca: 100,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 80,
		hco3: 100,
		desc: "British Pale Ale"
	},
	british_ipa: {
		ca: 150,
		mg: 25,
		na: 20,
		cl: 60,
		so4: 200,
		hco3: 100,
		desc: "British IPA"
	},
	british_stout: {
		ca: 100,
		mg: 25,
		na: 30,
		cl: 80,
		so4: 40,
		hco3: 250,
		desc: "British Stout"
	},
	porter: {
		ca: 100,
		mg: 25,
		na: 25,
		cl: 80,
		so4: 50,
		hco3: 200,
		desc: "Porter"
	},
	mild: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 40,
		hco3: 200,
		desc: "Mild"
	},
	bitter: {
		ca: 100,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 80,
		hco3: 100,
		desc: "Bitter"
	},
	esb: {
		ca: 120,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 100,
		hco3: 150,
		desc: "ESB"
	},
	barleywine: {
		ca: 80,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 50,
		hco3: 200,
		desc: "Barleywine"
	},
	old_ale: {
		ca: 80,
		mg: 25,
		na: 25,
		cl: 75,
		so4: 45,
		hco3: 250,
		desc: "Old Ale"
	},
	scotch_ale: {
		ca: 60,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 30,
		hco3: 200,
		desc: "Scotch Ale"
	},
	american_pale: {
		ca: 100,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 100,
		hco3: 100,
		desc: "American Pale Ale"
	},
	american_ipa: {
		ca: 120,
		mg: 25,
		na: 20,
		cl: 60,
		so4: 200,
		hco3: 100,
		desc: "American IPA"
	},
	double_ipa: {
		ca: 150,
		mg: 30,
		na: 20,
		cl: 70,
		so4: 250,
		hco3: 100,
		desc: "Double IPA"
	},
	american_stout: {
		ca: 100,
		mg: 25,
		na: 30,
		cl: 80,
		so4: 50,
		hco3: 250,
		desc: "American Stout"
	},
	imperial_stout: {
		ca: 100,
		mg: 30,
		na: 35,
		cl: 90,
		so4: 60,
		hco3: 300,
		desc: "Imperial Stout"
	},
	neipa: {
		ca: 100,
		mg: 20,
		na: 30,
		cl: 150,
		so4: 50,
		hco3: 150,
		desc: "NEIPA — high chloride"
	},
	cream_ale: {
		ca: 50,
		mg: 10,
		na: 10,
		cl: 40,
		so4: 20,
		hco3: 100,
		desc: "Cream Ale"
	},
	blonde_ale: {
		ca: 60,
		mg: 15,
		na: 12,
		cl: 50,
		so4: 30,
		hco3: 100,
		desc: "Blonde Ale"
	},
	california_common: {
		ca: 100,
		mg: 20,
		na: 20,
		cl: 60,
		so4: 80,
		hco3: 150,
		desc: "California Common"
	},
	american_lager: {
		ca: 30,
		mg: 8,
		na: 10,
		cl: 30,
		so4: 15,
		hco3: 50,
		desc: "American Lager"
	},
	light_lager: {
		ca: 20,
		mg: 5,
		na: 8,
		cl: 20,
		so4: 10,
		hco3: 30,
		desc: "Light Lager"
	},
	premium_lager: {
		ca: 40,
		mg: 10,
		na: 10,
		cl: 35,
		so4: 20,
		hco3: 60,
		desc: "Premium Lager"
	},
	amber_lager: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 40,
		hco3: 150,
		desc: "Amber Lager"
	},
	dark_lager: {
		ca: 100,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 50,
		hco3: 200,
		desc: "Dark Lager"
	},
	baltic_porter: {
		ca: 100,
		mg: 30,
		na: 25,
		cl: 80,
		so4: 60,
		hco3: 250,
		desc: "Baltic Porter"
	},
	rauchbier: {
		ca: 100,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 50,
		hco3: 200,
		desc: "Rauchbier"
	},
	roggenbier: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 30,
		hco3: 150,
		desc: "Roggenbier"
	},
	dampfbier: {
		ca: 60,
		mg: 15,
		na: 12,
		cl: 50,
		so4: 25,
		hco3: 100,
		desc: "Dampfbier"
	},
	sour_ale: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 100,
		desc: "Sour Ale"
	},
	brett_beer: {
		ca: 70,
		mg: 18,
		na: 15,
		cl: 55,
		so4: 40,
		hco3: 120,
		desc: "Brett Beer"
	},
	mixed_fermentation: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 100,
		desc: "Mixed Fermentation"
	},
	kveik_ale: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 40,
		hco3: 100,
		desc: "Kveik Ale"
	},
	brut_ipa: {
		ca: 100,
		mg: 25,
		na: 15,
		cl: 50,
		so4: 150,
		hco3: 50,
		desc: "Brut IPA"
	},
	session_ipa: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 100,
		hco3: 100,
		desc: "Session IPA"
	},
	wheat_ipa: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 60,
		so4: 80,
		hco3: 100,
		desc: "Wheat IPA"
	},
	black_ipa: {
		ca: 100,
		mg: 25,
		na: 25,
		cl: 70,
		so4: 100,
		hco3: 150,
		desc: "Black IPA"
	},
	red_ipa: {
		ca: 100,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 100,
		hco3: 150,
		desc: "Red IPA"
	},
	white_ipa: {
		ca: 70,
		mg: 18,
		na: 15,
		cl: 60,
		so4: 60,
		hco3: 100,
		desc: "White IPA"
	},
	belgian_ipa: {
		ca: 90,
		mg: 22,
		na: 18,
		cl: 60,
		so4: 80,
		hco3: 100,
		desc: "Belgian IPA"
	},
	new_england_ipa: {
		ca: 100,
		mg: 20,
		na: 30,
		cl: 150,
		so4: 50,
		hco3: 150,
		desc: "NEIPA"
	},
	milk_stout: {
		ca: 80,
		mg: 20,
		na: 25,
		cl: 70,
		so4: 40,
		hco3: 200,
		desc: "Milk Stout"
	},
	oatmeal_stout: {
		ca: 80,
		mg: 20,
		na: 25,
		cl: 70,
		so4: 40,
		hco3: 200,
		desc: "Oatmeal Stout"
	},
	dry_stout: {
		ca: 100,
		mg: 25,
		na: 30,
		cl: 80,
		so4: 50,
		hco3: 250,
		desc: "Dry Stout"
	},
	foreign_extra_stout: {
		ca: 100,
		mg: 25,
		na: 30,
		cl: 80,
		so4: 50,
		hco3: 250,
		desc: "Foreign Extra Stout"
	},
	american_porter: {
		ca: 100,
		mg: 25,
		na: 25,
		cl: 80,
		so4: 50,
		hco3: 200,
		desc: "American Porter"
	},
	brown_ale: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 50,
		hco3: 150,
		desc: "Brown Ale"
	},
	amber_ale: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 60,
		hco3: 150,
		desc: "Amber Ale"
	},
	red_ale: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 60,
		hco3: 150,
		desc: "Red Ale"
	},
	irish_red: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 50,
		hco3: 150,
		desc: "Irish Red"
	},
	scottish_light: {
		ca: 60,
		mg: 15,
		na: 15,
		cl: 60,
		so4: 30,
		hco3: 150,
		desc: "Scottish Light"
	},
	scottish_heavy: {
		ca: 70,
		mg: 18,
		na: 15,
		cl: 65,
		so4: 35,
		hco3: 180,
		desc: "Scottish Heavy"
	},
	scottish_export: {
		ca: 80,
		mg: 20,
		na: 15,
		cl: 70,
		so4: 40,
		hco3: 200,
		desc: "Scottish Export"
	},
	wee_heavy: {
		ca: 80,
		mg: 25,
		na: 20,
		cl: 70,
		so4: 40,
		hco3: 250,
		desc: "Wee Heavy"
	},
	english_ipa: {
		ca: 120,
		mg: 25,
		na: 20,
		cl: 60,
		so4: 150,
		hco3: 100,
		desc: "English IPA"
	},
	strong_bitter: {
		ca: 120,
		mg: 22,
		na: 18,
		cl: 65,
		so4: 100,
		hco3: 120,
		desc: "Strong Bitter"
	},
	brown_porter: {
		ca: 80,
		mg: 20,
		na: 20,
		cl: 70,
		so4: 40,
		hco3: 180,
		desc: "Brown Porter"
	},
	robust_porter: {
		ca: 100,
		mg: 22,
		na: 22,
		cl: 75,
		so4: 50,
		hco3: 200,
		desc: "Robust Porter"
	},
	imperial_stout_ris: {
		ca: 100,
		mg: 30,
		na: 35,
		cl: 90,
		so4: 60,
		hco3: 300,
		desc: "Imperial Stout RIS"
	},
	flanders_red: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 100,
		desc: "Flanders Red"
	},
	flanders_brown: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 100,
		desc: "Flanders Brown"
	},
	oud_bruin: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 100,
		desc: "Oud Bruin"
	},
	lambic_gueuze: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 200,
		desc: "Gueuze"
	},
	lambic_kriek: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 200,
		desc: "Kriek"
	},
	lambic_framboise: {
		ca: 60,
		mg: 15,
		na: 20,
		cl: 60,
		so4: 30,
		hco3: 200,
		desc: "Framboise"
	}
};
var WaterProfileCalculatorTool = class {
	name = "water_profile_calculator";
	description = "Calculate water mineral additions (gypsum, CaCl2, Epsom, baking soda, lactic acid) to hit a target water profile for any beer style. Uses a multi-variable solver that accounts for cross-ion contributions. Can auto-calculate mash & sparge water volumes from grain bill, dead space, absorption, and pre-boil/fermenter targets (BrewZilla-style). Pass grain_kg + fermenter_target_l for full auto mode, or mash_water_liters + sparge_water_liters for manual mode.";
	parameters = toInputJsonSchema(WaterProfileCalculatorInputSchema);
	resolveExecution(args) {
		return {
			description: `Water profile: ${args.target_profile}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const t = WATER[args.target_profile];
			if (!t) return Promise.resolve({
				isError: true,
				output: `Unknown: "${args.target_profile}"`
			});
			const s = args.source_water;
			const MASH_RATIO = args.mash_ratio_l_per_kg ?? 3;
			const DEAD_SPACE = args.dead_space_l ?? 6.5;
			const ABSORPTION = args.grain_absorption_l_per_kg ?? .9;
			const BOIL_OFF = args.boil_off_l_per_hour ?? 3;
			const BOIL_HOURS = args.boil_duration_h ?? 1;
			const TRUB_LOSS = args.trub_loss_l ?? 2;
			let preBoilTarget = args.pre_boil_target_l;
			if (preBoilTarget == null && args.fermenter_target_l != null) preBoilTarget = args.fermenter_target_l + BOIL_OFF * BOIL_HOURS + TRUB_LOSS;
			let mashVol = args.mash_water_liters;
			let spargeVol = args.sparge_water_liters;
			if (args.grain_kg != null && args.grain_kg > 0) {
				if (mashVol == null) mashVol = args.grain_kg * MASH_RATIO + DEAD_SPACE;
				if (spargeVol == null && preBoilTarget != null) {
					const absorptionLoss = args.grain_kg * ABSORPTION;
					spargeVol = preBoilTarget + absorptionLoss - mashVol;
					if (spargeVol < 0) spargeVol = 0;
				}
			}
			if (mashVol == null) mashVol = 0;
			if (spargeVol == null) spargeVol = 0;
			const totalVol = mashVol + spargeVol;
			if (totalVol <= 0) return Promise.resolve({
				isError: true,
				output: "Specificare mash_water_liters e/o sparge_water_liters, oppure grain_kg + fermenter_target_l per il calcolo automatico."
			});
			const MAX_GYPSUM = 3;
			const MAX_CACL2 = 3;
			const MAX_EPSOM = 2;
			const MAX_NAHCO3 = 2;
			let best = null;
			for (let pass = 0; pass < 2; pass++) {
				const steps = pass === 0 ? 20 : 5;
				const b = best;
				const gRange = pass === 0 ? MAX_GYPSUM : Math.min(b.gypsum + .3, MAX_GYPSUM);
				const gMin = pass === 0 ? 0 : Math.max(b.gypsum - .3, 0);
				const cRange = pass === 0 ? MAX_CACL2 : Math.min(b.cacl2 + .3, MAX_CACL2);
				const cMin = pass === 0 ? 0 : Math.max(b.cacl2 - .3, 0);
				const eRange = pass === 0 ? MAX_EPSOM : Math.min(b.epsom + .3, MAX_EPSOM);
				const eMin = pass === 0 ? 0 : Math.max(b.epsom - .3, 0);
				const nRange = pass === 0 ? MAX_NAHCO3 : Math.min(b.nahco3 + .3, MAX_NAHCO3);
				const nMin = pass === 0 ? 0 : Math.max(b.nahco3 - .3, 0);
				for (let gi = 0; gi <= steps; gi++) {
					const gypsum = gMin + (gRange - gMin) * gi / steps;
					for (let ci = 0; ci <= steps; ci++) {
						const cacl2 = cMin + (cRange - cMin) * ci / steps;
						for (let ei = 0; ei <= steps; ei++) {
							const epsom = eMin + (eRange - eMin) * ei / steps;
							for (let ni = 0; ni <= steps; ni++) {
								const nahco3 = nMin + (nRange - nMin) * ni / steps;
								const finalCa = s.ca + gypsum * SALT.gypsum.ca + cacl2 * SALT.cacl2.ca;
								const finalMg = s.mg + epsom * SALT.epsom.mg;
								const finalNa = s.na + nahco3 * SALT.nahco3.na;
								const finalCl = s.cl + cacl2 * SALT.cacl2.cl;
								const finalSo4 = s.so4 + gypsum * SALT.gypsum.so4 + epsom * SALT.epsom.so4;
								const finalHco3 = s.hco3 + nahco3 * SALT.nahco3.hco3;
								const errCa = t.ca > 0 ? ((finalCa - t.ca) / t.ca) ** 2 : finalCa ** 2;
								const errMg = t.mg > 0 ? ((finalMg - t.mg) / t.mg) ** 2 : finalMg ** 2;
								const errNa = t.na > 0 ? ((finalNa - t.na) / t.na) ** 2 : finalNa ** 2;
								const errCl = t.cl > 0 ? ((finalCl - t.cl) / t.cl) ** 2 : finalCl ** 2;
								const errSo4 = t.so4 > 0 ? ((finalSo4 - t.so4) / t.so4) ** 2 : finalSo4 ** 2;
								const errHco3 = t.hco3 > 0 ? ((finalHco3 - t.hco3) / t.hco3) ** 2 : finalHco3 ** 2;
								const overCa = finalCa > 200 ? (finalCa - 200) * .1 : 0;
								const overMg = finalMg > 30 ? (finalMg - 30) * .1 : 0;
								const overNa = finalNa > 150 ? (finalNa - 150) * .1 : 0;
								const overCl = finalCl > 300 ? (finalCl - 300) * .1 : 0;
								const overSo4 = finalSo4 > 400 ? (finalSo4 - 400) * .1 : 0;
								const error = errCa + errMg + errNa + errCl + errSo4 + errHco3 + overCa + overMg + overNa + overCl + overSo4;
								if (best === null || error < best.error) best = {
									gypsum,
									cacl2,
									epsom,
									nahco3,
									error
								};
							}
						}
					}
				}
			}
			if (!best) return Promise.resolve({
				isError: true,
				output: "Impossibile trovare una combinazione di sali valida."
			});
			const g = best.gypsum;
			const cc = best.cacl2;
			const e = best.epsom;
			const n = best.nahco3;
			const finalCa = s.ca + g * SALT.gypsum.ca + cc * SALT.cacl2.ca;
			const finalMg = s.mg + e * SALT.epsom.mg;
			const finalNa = s.na + n * SALT.nahco3.na;
			const finalCl = s.cl + cc * SALT.cacl2.cl;
			const finalSo4 = s.so4 + g * SALT.gypsum.so4 + e * SALT.epsom.so4;
			const finalHco3 = s.hco3 + n * SALT.nahco3.hco3;
			const hco3Reduction = s.hco3 - t.hco3;
			let acidMl = 0;
			if (hco3Reduction > 50) acidMl = hco3Reduction * totalVol * .001394;
			const lines = [
				`Profilo acqua per **${args.target_profile}** (${t.desc})`,
				"",
				`Volume acqua totale: ${totalVol.toFixed(1)} L (mash ${mashVol.toFixed(1)} L, sparge ${spargeVol.toFixed(1)} L)`
			];
			if (args.grain_kg != null && args.grain_kg > 0) {
				const pctMash = totalVol > 0 ? mashVol / totalVol * 100 : 0;
				const pctSparge = totalVol > 0 ? spargeVol / totalVol * 100 : 0;
				lines.push("", "Dettaglio calcolo volumi:", `  • Grani: ${args.grain_kg} kg`, `  • Rapporto mash: ${MASH_RATIO} L/kg → ${(args.grain_kg * MASH_RATIO).toFixed(1)} L`, `  • Spazio morto (dead space): ${DEAD_SPACE} L`, `  • Mash = ${(args.grain_kg * MASH_RATIO).toFixed(1)} + ${DEAD_SPACE} = ${mashVol.toFixed(1)} L`);
				if (preBoilTarget != null) {
					const absorptionLoss = args.grain_kg * ABSORPTION;
					lines.push(`  • Pre-boil target: ${preBoilTarget.toFixed(1)} L`, `  • Assorbimento trebbie: ${args.grain_kg} × ${ABSORPTION} = ${absorptionLoss.toFixed(1)} L`, `  • Sparge = ${preBoilTarget.toFixed(1)} + ${absorptionLoss.toFixed(1)} − ${mashVol.toFixed(1)} = ${spargeVol.toFixed(1)} L`);
				}
				if (args.fermenter_target_l != null) lines.push(`  • Fermentatore target: ${args.fermenter_target_l} L`, `  • Evaporazione: ${BOIL_OFF} L/h × ${BOIL_HOURS} h = ${(BOIL_OFF * BOIL_HOURS).toFixed(1)} L`, `  • Perdite trub/trasferimento: ${TRUB_LOSS} L`, `  • Pre-boil = ${args.fermenter_target_l} + ${(BOIL_OFF * BOIL_HOURS).toFixed(1)} + ${TRUB_LOSS} = ${preBoilTarget.toFixed(1)} L`);
				lines.push("", `Ripartizione: mash ${pctMash.toFixed(0)}% / sparge ${pctSparge.toFixed(0)}%`);
			}
			lines.push("", "Acqua sorgente → target → risultato:", `  Ca:   ${s.ca} → ${t.ca} → ${finalCa.toFixed(1)} mg/L`, `  Mg:   ${s.mg} → ${t.mg} → ${finalMg.toFixed(1)} mg/L`, `  Na:   ${s.na} → ${t.na} → ${finalNa.toFixed(1)} mg/L`, `  Cl:   ${s.cl} → ${t.cl} → ${finalCl.toFixed(1)} mg/L`, `  SO₄:  ${s.so4} → ${t.so4} → ${finalSo4.toFixed(1)} mg/L`, `  HCO₃: ${s.hco3} → ${t.hco3} → ${finalHco3.toFixed(1)} mg/L`, "", "Aggiunte consigliate (acqua totale):");
			const adds = [];
			const gypsumG = g * totalVol;
			const cacl2G = cc * totalVol;
			const epsomG = e * totalVol;
			const nahco3G = n * totalVol;
			if (gypsumG > .05) adds.push(`  • ${SALT.gypsum.label}: ~${gypsumG.toFixed(1)} g`);
			if (cacl2G > .05) adds.push(`  • ${SALT.cacl2.label}: ~${cacl2G.toFixed(1)} g`);
			if (epsomG > .05) adds.push(`  • ${SALT.epsom.label}: ~${epsomG.toFixed(1)} g`);
			if (nahco3G > .05) adds.push(`  • ${SALT.nahco3.label}: ~${nahco3G.toFixed(1)} g`);
			if (acidMl > .5) adds.push(`  • Acido lattico 88%: ~${acidMl.toFixed(1)} ml (nel mash)`);
			if (adds.length === 0) adds.push("  • Nessuna aggiunta necessaria.");
			lines.push(...adds);
			const warnings = [];
			const so4Dev = finalSo4 - t.so4;
			if (Math.abs(so4Dev) > 10) warnings.push(`  ⚠ SO₄ devia di ${so4Dev > 0 ? "+" : ""}${so4Dev.toFixed(0)} mg/L dal target (compromesso con Ca/Mg).`);
			const naDev = finalNa - t.na;
			if (Math.abs(naDev) > 10) warnings.push(`  ⚠ Na devia di ${naDev > 0 ? "+" : ""}${naDev.toFixed(0)} mg/L dal target (legato a HCO₃).`);
			if (acidMl > .5) warnings.push("  ⚠ L'acido lattico è una stima. Il pH reale dipende da alcalinità, grist e pH target.");
			if (warnings.length > 0) lines.push("", "Note:", ...warnings);
			return Promise.resolve({ output: lines.join("\n") });
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
};
registerTool(WaterProfileCalculatorTool);

//#endregion
//#region src/brewing/ibu-calculator.ts
/**
* IBU calculator — compute IBU with Tinseth or Rager models.
* Supports multiple hop additions and a 100+ hop alpha-acid database.
* Whirlpool IBU is an empirical temperature-based estimate.
*/
const IbuCalculatorInputSchema = object({
	model: _enum(["tinseth", "rager"]).default("tinseth"),
	batch_size_liters: number().positive().describe("Final wort or beer volume used for the IBU calculation, in liters."),
	boil_gravity: number().min(1).max(1.3).describe("Average boil gravity, e.g. 1.040."),
	original_gravity: number().min(1).max(1.3).optional().describe("Original gravity used only for the BU:GU ratio, e.g. 1.050."),
	boil_duration_minutes: number().int().positive().default(60),
	hops: array(object({
		variety: string().min(1),
		alpha_acids_percent: number().min(0).max(30).optional().describe("Alpha acid percentage of the hop. If omitted, the calculator uses an internal database average."),
		grams: number().nonnegative(),
		time_minutes: number().nonnegative().describe("For boil additions: minutes remaining in the boil. For whirlpool additions: duration of the hop stand."),
		form: _enum([
			"pellet",
			"whole",
			"plug"
		]).default("pellet"),
		use: _enum([
			"boil",
			"whirlpool",
			"dry_hop",
			"first_wort",
			"mash"
		]).default("boil"),
		whirlpool_temperature_c: number().min(50).max(100).optional()
	}))
}).superRefine((data, ctx) => {
	data.hops.forEach((hop, index) => {
		if (hop.use === "boil" && hop.time_minutes > data.boil_duration_minutes) ctx.addIssue({
			code: ZodIssueCode.custom,
			path: [
				"hops",
				index,
				"time_minutes"
			],
			message: "Boil hop time cannot exceed the total boil duration."
		});
		if (hop.use === "whirlpool" && hop.whirlpool_temperature_c === void 0) ctx.addIssue({
			code: ZodIssueCode.custom,
			path: [
				"hops",
				index,
				"whirlpool_temperature_c"
			],
			message: "Whirlpool temperature is required for whirlpool additions."
		});
	});
});
const HOP_AA = {
	"admiral": 14,
	"amarillo": 9,
	"apollo": 18.5,
	"aramis": 8,
	"archer": 5,
	"aurora": 8,
	"azacca": 15,
	"bobek": 5,
	"bramling cross": 6,
	"bravo": 15,
	"brewer's gold": 9,
	"bullion": 8,
	"calypso": 13,
	"cascade": 5.5,
	"cashmere": 8,
	"celeia": 5,
	"centennial": 10,
	"challenger": 7,
	"chinook": 13,
	"citra": 12,
	"cluster": 7.5,
	"columbus": 15,
	"comet": 10,
	"crystal": 3.5,
	"dana": 10,
	"denali": 15,
	"dr. rudi": 11,
	"east kent goldings": 5,
	"ekuanot": 15,
	"el dorado": 15,
	"ella": 14.5,
	"enigma": 16.5,
	"eureka": 18,
	"falconer's flight": 11,
	"first gold": 7.5,
	"fuggles": 4.5,
	"galaxy": 14,
	"galena": 13,
	"glacier": 5.5,
	"goldings": 5,
	"green bullet": 12,
	"hallertau": 4.5,
	"hallertau blanka": 11,
	"hallertau hersbrucker": 4,
	"hallertau mittelfruh": 4.5,
	"hallertau taurus": 15,
	"helga": 6.5,
	"herald": 12,
	"herkules": 16,
	"hersbrucker": 3.5,
	"horizon": 12,
	"hbc 586": 11,
	"huell melon": 6.5,
	"hull melon": 6.5,
	"idaho 7": 13,
	"jarrylo": 15,
	"jester": 8,
	"kazbek": 5.5,
	"kohatu": 6.5,
	"lemondrop": 6,
	"liberty": 4,
	"loral": 11.5,
	"lotus": 14,
	"lublin": 4,
	"magnum": 13,
	"mandarina bavaria": 9,
	"mandarina": 9,
	"marynka": 9,
	"medusa": 5.5,
	"meridian": 6,
	"merkur": 13,
	"millennium": 15.5,
	"monroe": 7.5,
	"mosaic": 12.5,
	"motueka": 7,
	"mt. hood": 6,
	"nelson sauvin": 12.5,
	"newport": 15,
	"northern brewer": 9,
	"northdown": 8,
	"nugget": 13,
	"olympic": 12,
	"omega": 10,
	"opal": 6,
	"pacific gem": 15,
	"pacific jade": 13,
	"pacifica": 5.5,
	"pahto": 18,
	"palisade": 8,
	"pekko": 8.5,
	"perle": 8,
	"pilgrim": 10,
	"pioneer": 9,
	"polaris": 20,
	"premiant": 9,
	"pride of ringwood": 9,
	"progress": 6,
	"rakau": 11,
	"riwaka": 5.5,
	"saaz": 4,
	"sabro": 14,
	"santiam": 6,
	"saphir": 3.5,
	"select": 5,
	"serebrianka": 3.5,
	"simcoe": 13,
	"smaragd": 5,
	"sorachi ace": 12,
	"southern cross": 12,
	"sovereign": 5,
	"spalt": 4.5,
	"sterling": 7.5,
	"sticklebract": 13,
	"strata": 12,
	"styrian aurora": 8,
	"styrian bobek": 5,
	"styrian celeia": 5,
	"styrian dragon": 10,
	"styrian goldings": 5,
	"styrian wolf": 13,
	"sultana": 13.5,
	"summit": 17.5,
	"super alpha": 13,
	"super pride": 14,
	"sylva": 6,
	"taiheke": 7,
	"target": 11,
	"tettnang": 4.5,
	"tomahawk": 17,
	"topaz": 16.5,
	"tradition": 6,
	"triple pearl": 10.5,
	"triskel": 8,
	"vanguard": 5.5,
	"vic secret": 17,
	"victoria": 13,
	"waimea": 16,
	"wai-iti": 3,
	"wakatu": 7.5,
	"warrior": 16,
	"whitbread golding": 6,
	"willamette": 5.5,
	"yakima chief": 10,
	"zeus": 16,
	"zythos": 11
};
const AVAILABLE_HOP_LIST = Object.keys(HOP_AA).sort().join(", ");
var IbuCalculatorTool = class {
	name = "ibu_calculator";
	description = "Calculate IBU using Tinseth or Rager. Supports boil, first-wort and empirical whirlpool estimates.";
	parameters = toInputJsonSchema(IbuCalculatorInputSchema);
	resolveExecution(rawArgs) {
		const args = IbuCalculatorInputSchema.parse(rawArgs);
		return {
			description: `IBU calculation (${args.model})`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const model = args.model ?? "tinseth";
			let totalIbu = 0;
			const lines = [];
			const warnings = [];
			for (const hop of args.hops) {
				const normalizedVariety = hop.variety.trim().toLowerCase();
				const databaseAa = HOP_AA[normalizedVariety];
				const aa = hop.alpha_acids_percent ?? databaseAa;
				if (aa === void 0) return Promise.resolve({
					isError: true,
					output: `Unknown hop: "${hop.variety}". Provide alpha_acids_percent explicitly, or choose from:

` + AVAILABLE_HOP_LIST
				});
				const aaSource = hop.alpha_acids_percent === void 0 ? "database average" : "user supplied";
				const ibu = this.calculateHopIbu(model, hop, aa, args);
				totalIbu += ibu;
				if (hop.alpha_acids_percent === void 0) warnings.push(`${hop.variety}: AA% taken from the internal database (${aa.toFixed(1)}%). Use the package value for better accuracy.`);
				if (hop.use === "dry_hop") warnings.push(`${hop.variety}: dry hopping is reported as 0 calculated IBU. It may still affect measured and perceived bitterness.`);
				if (hop.use === "mash") warnings.push(`${hop.variety}: mash hopping is reported as 0 calculated IBU.`);
				const detailParts = [
					`${hop.variety}`,
					`${hop.form}`,
					`${hop.use}`,
					`${hop.grams}g`
				];
				if (hop.use === "first_wort") detailParts.push(`${args.boil_duration_minutes} min effective boil`);
				else detailParts.push(`${hop.time_minutes} min`);
				if (hop.use === "whirlpool" && hop.whirlpool_temperature_c !== void 0) detailParts.push(`${hop.whirlpool_temperature_c}°C`);
				detailParts.push(`${aa}% AA`, aaSource);
				lines.push(`  ${detailParts.join(", ")} → **${ibu.toFixed(1)} IBU**`);
			}
			const output = [
				`**IBU totale (${model}): ${totalIbu.toFixed(1)}**`,
				"",
				...lines
			];
			if (args.original_gravity !== void 0) {
				const gravityUnits = (args.original_gravity - 1) * 1e3;
				if (gravityUnits > 0) {
					const buGu = totalIbu / gravityUnits;
					output.push("", `Rapporto BU:GU: ${buGu.toFixed(2)}`);
				}
			}
			const uniqueWarnings = [...new Set(warnings)];
			if (uniqueWarnings.length > 0) output.push("", "**Note:**", ...uniqueWarnings.map((warning) => `- ${warning}`));
			return Promise.resolve({ output: output.join("\n") });
		} catch (error) {
			return Promise.resolve({
				isError: true,
				output: error instanceof Error ? error.message : String(error)
			});
		}
	}
	calculateHopIbu(model, hop, aaPercent, args) {
		if (hop.grams === 0 || aaPercent === 0) return 0;
		switch (hop.use) {
			case "boil": return this.calculateBoilIbu(model, hop.grams, aaPercent, hop.time_minutes, args.boil_gravity, args.batch_size_liters, hop.form);
			case "first_wort": return this.calculateBoilIbu(model, hop.grams, aaPercent, args.boil_duration_minutes, args.boil_gravity, args.batch_size_liters, hop.form) * 1.1;
			case "whirlpool": return this.calculateWhirlpoolIbu(model, hop, aaPercent, args.boil_gravity, args.batch_size_liters);
			case "dry_hop":
			case "mash": return 0;
			default: return 0;
		}
	}
	calculateBoilIbu(model, grams, aaPercent, timeMinutes, gravity, volumeLiters, form) {
		const formFactor = this.getHopFormFactor(form);
		if (model === "rager") {
			const utilization = this.ragerUtilization(timeMinutes) * formFactor;
			const gravityAdjustment = this.ragerGravityAdjustment(gravity);
			return grams * aaPercent * utilization * 10 / (volumeLiters * (1 + gravityAdjustment));
		}
		const utilization = this.tinsethUtilization(timeMinutes, gravity) * formFactor;
		return grams * aaPercent * utilization * 10 / volumeLiters;
	}
	calculateWhirlpoolIbu(model, hop, aaPercent, gravity, volumeLiters) {
		const temperature = hop.whirlpool_temperature_c;
		if (temperature === void 0) return 0;
		const temperatureFactor = this.whirlpoolTemperatureFactor(temperature);
		if (temperatureFactor <= 0) return 0;
		return this.calculateBoilIbu(model, hop.grams, aaPercent, 0, gravity, volumeLiters, hop.form) * temperatureFactor;
	}
	tinsethUtilization(timeMinutes, gravity) {
		return 1.65 * Math.pow(125e-6, gravity - 1) * ((1 - Math.exp(-.04 * timeMinutes)) / 4.15);
	}
	ragerUtilization(timeMinutes) {
		return (18.11 + 13.86 * Math.tanh((timeMinutes - 31.32) / 18.27)) / 100;
	}
	/**
	* Rager gravity adjustment factor for the IBU denominator.
	*
	* When boil gravity exceeds 1.050, utilisation drops linearly.
	* The factor is `0.00065 × (gravityUnits - 50)` and is used as:
	*
	*   IBU = (grams × AA% × utilisation × 10) / (volume × (1 + adjustment))
	*/
	ragerGravityAdjustment(gravity) {
		const gravityUnits = (gravity - 1) * 1e3;
		if (gravityUnits <= 50) return 0;
		return 65e-5 * (gravityUnits - 50);
	}
	/**
	* Hop-form efficiency factor used as a multiplier on utilisation.
	*
	*   - pellet: × 1.10 (empirical convention)
	*   - plug:   × 1.05
	*   - whole:  × 1.00 (baseline)
	*/
	getHopFormFactor(form) {
		switch (form) {
			case "pellet": return 1.1;
			case "plug": return 1.05;
			default: return 1;
		}
	}
	/**
	* Empirical temperature factor for whirlpool hop additions.
	*
	* Based on the observation that isomerisation continues at whirlpool
	* temperatures but at reduced rates. Values are deliberately conservative.
	*/
	whirlpoolTemperatureFactor(temperatureC) {
		if (temperatureC >= 95) return .5;
		if (temperatureC >= 90) return .35;
		if (temperatureC >= 85) return .2;
		if (temperatureC >= 80) return .1;
		if (temperatureC >= 75) return .05;
		return 0;
	}
};
registerTool(IbuCalculatorTool);

//#endregion
//#region src/brewing/priming-calculator.ts
/**
* Priming calculator — compute sugar dosage for natural carbonation.
*/
const PrimingCalculatorInputSchema = object({
	batch_size_liters: number().describe("Batch size in liters."),
	beer_temperature_c: number().describe("Beer temperature at bottling in °C."),
	target_co2_volumes: number().optional().describe("Target CO2 volumes."),
	beer_style: string().optional().describe("Beer style for default carbonation."),
	sugar_type: _enum([
		"sucrose",
		"dextrose",
		"dme",
		"honey",
		"maple_syrup"
	]).default("sucrose"),
	packaging: _enum(["bottle", "keg"]).default("bottle")
});
const CARB = {
	"british_ale": 1.8,
	"mild": 1.8,
	"bitter": 1.8,
	"esb": 2,
	"porter": 2,
	"stout": 2,
	"brown_ale": 2.2,
	"scotch_ale": 2.2,
	"barleywine": 2.2,
	"english_ipa": 2.2,
	"american_pale": 2.4,
	"american_ipa": 2.4,
	"double_ipa": 2.4,
	"session_ipa": 2.4,
	"amber_ale": 2.4,
	"red_ale": 2.4,
	"blonde_ale": 2.4,
	"cream_ale": 2.4,
	"american_lager": 2.5,
	"light_lager": 2.5,
	"pilsner": 2.4,
	"helles": 2.4,
	"vienna": 2.4,
	"marzen": 2.4,
	"bock": 2.4,
	"dunkel": 2.4,
	"schwarzbier": 2.4,
	"kolsch": 2.4,
	"altbier": 2.4,
	"weissbier": 3,
	"dunkelweizen": 3,
	"weizenbock": 3,
	"berliner_weisse": 3,
	"gose": 3,
	"lambic": 3,
	"saison": 3,
	"belgian_pale": 2.4,
	"belgian_dubbel": 2.6,
	"belgian_tripel": 2.8,
	"belgian_golden_strong": 2.8,
	"belgian_dark_strong": 2.6,
	"witbier": 2.6,
	"neipa": 2.4,
	"kveik_ale": 2.4,
	"sour_ale": 2.6,
	"brett_beer": 2.6,
	"mixed_fermentation": 2.6,
	"doppelbock": 2.4
};
const SUGARS = {
	sucrose: {
		gramsPerLiterPerVolume: 4,
		name: "Saccarosio"
	},
	dextrose: {
		gramsPerLiterPerVolume: 4.4,
		name: "Destrosio monoidrato"
	},
	dme: {
		gramsPerLiterPerVolume: 5.9,
		name: "DME"
	},
	honey: {
		gramsPerLiterPerVolume: 5.4,
		name: "Miele"
	},
	maple_syrup: {
		gramsPerLiterPerVolume: 5.2,
		name: "Sciroppo d'acero"
	}
};
function calculateResidualCo2(tempC) {
	const tempF = tempC * 9 / 5 + 32;
	const residual = 3.0378 - .050062 * tempF + 26555e-8 * tempF ** 2;
	return Math.max(0, residual);
}
var PrimingCalculatorTool = class {
	name = "priming_calculator";
	description = "Calculate priming sugar dosage for natural carbonation in bottle or keg. Supports sucrose, dextrose, DME, honey, and maple syrup.";
	parameters = toInputJsonSchema(PrimingCalculatorInputSchema);
	resolveExecution(args) {
		return {
			description: `Priming calculation (${args.packaging})`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			let target = args.target_co2_volumes;
			if (target === void 0 && args.beer_style) target = CARB[args.beer_style];
			target ??= 2.4;
			const tempC = args.beer_temperature_c;
			const residual = calculateResidualCo2(tempC);
			const co2ToAdd = target - residual;
			if (co2ToAdd <= 0) return Promise.resolve({ output: `CO2 residua sufficiente (${residual.toFixed(2)} vol per ${target} target). Nessuno zucchero necessario.` });
			const sugar = SUGARS[args.sugar_type ?? "sucrose"];
			if (!sugar) return Promise.resolve({
				isError: true,
				output: `Zucchero non supportato: "${args.sugar_type}"`
			});
			const gPerL = co2ToAdd * sugar.gramsPerLiterPerVolume;
			const total = gPerL * args.batch_size_liters;
			return Promise.resolve({ output: [
				`**Priming: ${total.toFixed(1)} g di ${sugar.name}**`,
				`Dosaggio: ${gPerL.toFixed(1)} g/L × ${args.batch_size_liters.toFixed(1)} L`,
				`Carbonazione target: ${target.toFixed(1)} vol CO2`,
				`CO2 residua a ${tempC}°C: ${residual.toFixed(2)} vol`,
				`CO2 da aggiungere: ${co2ToAdd.toFixed(2)} vol`
			].join("\n") });
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
};
registerTool(PrimingCalculatorTool);

//#endregion
//#region src/brewing/recipe-validator.ts
/**
* Recipe validator — produces a complete LLM review prompt for a beer recipe
* against BJCP style guidelines.
*
* Use this tool AFTER running yaml_validator on the YAML file. The yaml_validator
* covers all deterministic checks; recipe_validator takes the structured recipe
* data (passed directly as JSON) and builds a comprehensive LLM review prompt
* with BJCP data, recipe summary, and the expected output JSON schema.
*/
const RecipeValidatorInputSchema = object({
	recipe_name: string(),
	beer_style: string().describe("BJCP style code or name."),
	batch_size_liters: number(),
	og: number(),
	fg: number(),
	ibu: number(),
	ebc: number().optional(),
	abv_percent: number().optional(),
	efficiency_percent: number().optional(),
	grain_bill: array(object({
		malt: string(),
		kg: number(),
		percent: number().optional(),
		ebc: number().optional(),
		note: string().optional()
	})),
	hop_schedule: array(object({
		variety: string(),
		grams: number(),
		time_minutes: number(),
		use: _enum([
			"boil",
			"whirlpool",
			"dry_hop",
			"first_wort",
			"mash",
			"hopback",
			"dip_hop",
			"hop_stand"
		]),
		aa_percent: number().optional(),
		ibu_contrib: number().optional(),
		note: string().optional()
	})),
	yeast: object({
		strain: string(),
		attenuation_percent: number().optional(),
		lab: string().optional()
	}),
	mash_temp_c: number().optional(),
	mash_steps: array(object({
		temperature_c: number(),
		time_minutes: number(),
		note: string().optional()
	})).optional(),
	fermentation_temp_c: number().optional(),
	water_profile: object({
		ca: number(),
		mg: number(),
		na: number(),
		cl: number(),
		so4: number(),
		hco3: number()
	}).optional(),
	boil_time_minutes: number().optional(),
	pre_boil_volume_liters: number().optional(),
	post_boil_volume_liters: number().optional(),
	fermentation_volume_liters: number().optional(),
	packaging_volume_liters: number().optional(),
	carbonation_volumes: number().optional(),
	carbonation_method: string().optional(),
	priming_sugar_gl: number().optional(),
	impianto: string().optional(),
	descrizione: string().optional(),
	note: string().optional(),
	mash_water_liters: number().optional().describe("Agua de ammostamento (mash) en litros."),
	sparge_water_liters: number().optional().describe("Agua de lavado (sparge) en litros."),
	total_water_liters: number().optional().describe("Agua total de la cotización en litros."),
	mash_salts: object({
		gypsum_g: number().optional().describe("Gesso (CaSO₄) en gramos."),
		cacl2_g: number().optional().describe("Cloruro de calcio (CaCl₂) en gramos."),
		epsom_g: number().optional().describe("Sal de Epsom (MgSO₄) en gramos."),
		nahco3_g: number().optional().describe("Bicarbonato de sodio (NaHCO₃) en gramos."),
		lactic_acid_ml: number().optional().describe("Ácido láctico (88%) en ml.")
	}).optional(),
	mash_in_temp_c: number().optional().describe("Temperatura de mash-in (empaste) en °C."),
	pre_boil_og: number().optional().describe("Gravedad pre-boil (SG)."),
	post_boil_og: number().optional().describe("Gravedad post-boil (SG)."),
	primary_days: number().optional().describe("Días de fermentación primaria."),
	conditioning_days: number().optional().describe("Días de maduración/condicionamiento."),
	serving_temp_c: number().optional().describe("Temperatura de servicio en °C."),
	bottle_type: string().optional().describe("Tipo de botella (es. 500ml, 330ml, swing-top).")
});
const BJCP$1 = {
	"1A": {
		code: "1A",
		category: "1",
		name: "American Light Lager",
		og_min: 1.028,
		og_max: 1.04,
		fg_min: .998,
		fg_max: 1.008,
		abv_min: 2.8,
		abv_max: 4.2,
		ibu_min: 8,
		ibu_max: 12,
		ebc_min: 4,
		ebc_max: 6
	},
	"1B": {
		code: "1B",
		category: "1",
		name: "American Lager",
		og_min: 1.04,
		og_max: 1.05,
		fg_min: 1.004,
		fg_max: 1.01,
		abv_min: 4.2,
		abv_max: 5.3,
		ibu_min: 8,
		ibu_max: 18,
		ebc_min: 4,
		ebc_max: 8
	},
	"1C": {
		code: "1C",
		category: "1",
		name: "Cream Ale",
		og_min: 1.042,
		og_max: 1.055,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 4.2,
		abv_max: 5.6,
		ibu_min: 8,
		ibu_max: 20,
		ebc_min: 4,
		ebc_max: 10
	},
	"1D": {
		code: "1D",
		category: "1",
		name: "American Wheat Beer",
		og_min: 1.04,
		og_max: 1.055,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4,
		abv_max: 5.5,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 6,
		ebc_max: 12
	},
	"2A": {
		code: "2A",
		category: "2",
		name: "International Pale Lager",
		og_min: 1.042,
		og_max: 1.05,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.6,
		abv_max: 6,
		ibu_min: 18,
		ibu_max: 25,
		ebc_min: 4,
		ebc_max: 10
	},
	"2B": {
		code: "2B",
		category: "2",
		name: "International Amber Lager",
		og_min: 1.042,
		og_max: 1.055,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4.6,
		abv_max: 6,
		ibu_min: 8,
		ibu_max: 25,
		ebc_min: 14,
		ebc_max: 34
	},
	"2C": {
		code: "2C",
		category: "2",
		name: "International Dark Lager",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 8,
		ibu_max: 20,
		ebc_min: 28,
		ebc_max: 50
	},
	"3A": {
		code: "3A",
		category: "3",
		name: "Czech Pale Lager",
		og_min: 1.028,
		og_max: 1.044,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 3,
		abv_max: 4,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 14
	},
	"3B": {
		code: "3B",
		category: "3",
		name: "Czech Premium Pale Lager",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.2,
		abv_max: 5.8,
		ibu_min: 30,
		ibu_max: 45,
		ebc_min: 6,
		ebc_max: 14
	},
	"3C": {
		code: "3C",
		category: "3",
		name: "Czech Amber Lager",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.4,
		abv_max: 5.8,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 20,
		ebc_max: 40
	},
	"3D": {
		code: "3D",
		category: "3",
		name: "Czech Dark Lager",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.4,
		abv_max: 5.8,
		ibu_min: 18,
		ibu_max: 34,
		ebc_min: 34,
		ebc_max: 70
	},
	"4A": {
		code: "4A",
		category: "4",
		name: "Munich Helles",
		og_min: 1.044,
		og_max: 1.048,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 4.7,
		abv_max: 5.4,
		ibu_min: 16,
		ibu_max: 22,
		ebc_min: 6,
		ebc_max: 10
	},
	"4B": {
		code: "4B",
		category: "4",
		name: "Festbier",
		og_min: 1.054,
		og_max: 1.058,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.8,
		abv_max: 6.3,
		ibu_min: 18,
		ibu_max: 25,
		ebc_min: 8,
		ebc_max: 14
	},
	"4C": {
		code: "4C",
		category: "4",
		name: "Helles Bock",
		og_min: 1.064,
		og_max: 1.072,
		fg_min: 1.011,
		fg_max: 1.018,
		abv_min: 6.3,
		abv_max: 7.4,
		ibu_min: 23,
		ibu_max: 35,
		ebc_min: 12,
		ebc_max: 20
	},
	"5A": {
		code: "5A",
		category: "5",
		name: "German Leichtbier",
		og_min: 1.026,
		og_max: 1.034,
		fg_min: 1.006,
		fg_max: 1.01,
		abv_min: 2.4,
		abv_max: 3.6,
		ibu_min: 15,
		ibu_max: 28,
		ebc_min: 4,
		ebc_max: 8
	},
	"5B": {
		code: "5B",
		category: "5",
		name: "Kölsch",
		og_min: 1.044,
		og_max: 1.05,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 4.4,
		abv_max: 5.2,
		ibu_min: 18,
		ibu_max: 30,
		ebc_min: 7,
		ebc_max: 10
	},
	"5C": {
		code: "5C",
		category: "5",
		name: "German Helles Exportbier",
		og_min: 1.048,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 8,
		ebc_max: 12
	},
	"5D": {
		code: "5D",
		category: "5",
		name: "German Pils",
		og_min: 1.044,
		og_max: 1.05,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.4,
		abv_max: 5.2,
		ibu_min: 22,
		ibu_max: 40,
		ebc_min: 4,
		ebc_max: 8
	},
	"6A": {
		code: "6A",
		category: "6",
		name: "Märzen",
		og_min: 1.054,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.8,
		abv_max: 6.3,
		ibu_min: 18,
		ibu_max: 24,
		ebc_min: 16,
		ebc_max: 30
	},
	"6B": {
		code: "6B",
		category: "6",
		name: "Rauchbier",
		og_min: 1.05,
		og_max: 1.057,
		fg_min: 1.012,
		fg_max: 1.016,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 44
	},
	"6C": {
		code: "6C",
		category: "6",
		name: "Dunkels Bock",
		og_min: 1.064,
		og_max: 1.072,
		fg_min: 1.013,
		fg_max: 1.019,
		abv_min: 6.3,
		abv_max: 7.2,
		ibu_min: 20,
		ibu_max: 27,
		ebc_min: 28,
		ebc_max: 44
	},
	"7A": {
		code: "7A",
		category: "7",
		name: "Vienna Lager",
		og_min: 1.048,
		og_max: 1.055,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.7,
		abv_max: 5.5,
		ibu_min: 18,
		ibu_max: 30,
		ebc_min: 18,
		ebc_max: 30
	},
	"7B": {
		code: "7B",
		category: "7",
		name: "Altbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.5,
		ibu_min: 25,
		ibu_max: 50,
		ebc_min: 22,
		ebc_max: 34
	},
	"7C": {
		code: "7C",
		category: "7",
		name: "Kellerbier",
		og_min: 1.045,
		og_max: 1.051,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.7,
		abv_max: 5.4,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 20
	},
	"8A": {
		code: "8A",
		category: "8",
		name: "Munich Dunkel",
		og_min: 1.048,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.5,
		abv_max: 5.6,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 28,
		ebc_max: 46
	},
	"8B": {
		code: "8B",
		category: "8",
		name: "Schwarzbier",
		og_min: 1.046,
		og_max: 1.052,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.4,
		abv_max: 5.4,
		ibu_min: 22,
		ibu_max: 30,
		ebc_min: 34,
		ebc_max: 62
	},
	"9A": {
		code: "9A",
		category: "9",
		name: "Doppelbock",
		og_min: 1.072,
		og_max: 1.112,
		fg_min: 1.016,
		fg_max: 1.024,
		abv_min: 7,
		abv_max: 10,
		ibu_min: 16,
		ibu_max: 26,
		ebc_min: 24,
		ebc_max: 45
	},
	"9B": {
		code: "9B",
		category: "9",
		name: "Eisbock",
		og_min: 1.078,
		og_max: 1.12,
		fg_min: 1.02,
		fg_max: 1.035,
		abv_min: 9,
		abv_max: 14,
		ibu_min: 25,
		ibu_max: 35,
		ebc_min: 36,
		ebc_max: 68
	},
	"9C": {
		code: "9C",
		category: "9",
		name: "Baltic Porter",
		og_min: 1.06,
		og_max: 1.09,
		fg_min: 1.016,
		fg_max: 1.024,
		abv_min: 6.5,
		abv_max: 9.5,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 34,
		ebc_max: 60
	},
	"10A": {
		code: "10A",
		category: "10",
		name: "Weissbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.6,
		ibu_min: 8,
		ibu_max: 15,
		ebc_min: 4,
		ebc_max: 14
	},
	"10B": {
		code: "10B",
		category: "10",
		name: "Dunkles Weissbier",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.6,
		ibu_min: 10,
		ibu_max: 18,
		ebc_min: 28,
		ebc_max: 46
	},
	"10C": {
		code: "10C",
		category: "10",
		name: "Weizenbock",
		og_min: 1.064,
		og_max: 1.09,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 6.5,
		abv_max: 9,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 12,
		ebc_max: 44
	},
	"11A": {
		code: "11A",
		category: "11",
		name: "Ordinary Bitter",
		og_min: 1.03,
		og_max: 1.039,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 3.2,
		abv_max: 3.8,
		ibu_min: 25,
		ibu_max: 35,
		ebc_min: 16,
		ebc_max: 28
	},
	"11B": {
		code: "11B",
		category: "11",
		name: "Best Bitter",
		og_min: 1.04,
		og_max: 1.048,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 3.8,
		abv_max: 4.6,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 16,
		ebc_max: 28
	},
	"11C": {
		code: "11C",
		category: "11",
		name: "Strong Bitter",
		og_min: 1.048,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.6,
		abv_max: 6.2,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 18,
		ebc_max: 40
	},
	"12A": {
		code: "12A",
		category: "12",
		name: "British Golden Ale",
		og_min: 1.038,
		og_max: 1.053,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 3.8,
		abv_max: 5,
		ibu_min: 20,
		ibu_max: 45,
		ebc_min: 4,
		ebc_max: 12
	},
	"12B": {
		code: "12B",
		category: "12",
		name: "Australian Sparkling Ale",
		og_min: 1.038,
		og_max: 1.05,
		fg_min: 1.004,
		fg_max: 1.006,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 4,
		ebc_max: 14
	},
	"12C": {
		code: "12C",
		category: "12",
		name: "English IPA",
		og_min: 1.05,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 5,
		abv_max: 7.5,
		ibu_min: 40,
		ibu_max: 60,
		ebc_min: 12,
		ebc_max: 30
	},
	"13A": {
		code: "13A",
		category: "13",
		name: "Dark Mild",
		og_min: 1.03,
		og_max: 1.038,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 3,
		abv_max: 3.8,
		ibu_min: 10,
		ibu_max: 25,
		ebc_min: 24,
		ebc_max: 44
	},
	"13B": {
		code: "13B",
		category: "13",
		name: "British Brown Ale",
		og_min: 1.04,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.2,
		abv_max: 5.9,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 44
	},
	"13C": {
		code: "13C",
		category: "13",
		name: "English Porter",
		og_min: 1.04,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4,
		abv_max: 5.4,
		ibu_min: 18,
		ibu_max: 35,
		ebc_min: 40,
		ebc_max: 60
	},
	"14A": {
		code: "14A",
		category: "14",
		name: "Scottish Light",
		og_min: 1.03,
		og_max: 1.035,
		fg_min: 1.01,
		fg_max: 1.013,
		abv_min: 2.5,
		abv_max: 3.2,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 30,
		ebc_max: 50
	},
	"14B": {
		code: "14B",
		category: "14",
		name: "Scottish Heavy",
		og_min: 1.035,
		og_max: 1.04,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 3.2,
		abv_max: 3.9,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 24,
		ebc_max: 40
	},
	"14C": {
		code: "14C",
		category: "14",
		name: "Scottish Export",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 3.9,
		abv_max: 6,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 40
	},
	"15A": {
		code: "15A",
		category: "15",
		name: "Irish Red Ale",
		og_min: 1.036,
		og_max: 1.046,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 3.8,
		abv_max: 5,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 18,
		ebc_max: 36
	},
	"15B": {
		code: "15B",
		category: "15",
		name: "Irish Stout",
		og_min: 1.036,
		og_max: 1.044,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 4,
		abv_max: 4.5,
		ibu_min: 25,
		ibu_max: 45,
		ebc_min: 50,
		ebc_max: 80
	},
	"15C": {
		code: "15C",
		category: "15",
		name: "Irish Extra Stout",
		og_min: 1.052,
		og_max: 1.062,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.5,
		abv_max: 6.5,
		ibu_min: 35,
		ibu_max: 50,
		ebc_min: 60,
		ebc_max: 80
	},
	"16A": {
		code: "16A",
		category: "16",
		name: "Sweet Stout",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.012,
		fg_max: 1.024,
		abv_min: 4,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 60,
		ebc_max: 100
	},
	"16B": {
		code: "16B",
		category: "16",
		name: "Oatmeal Stout",
		og_min: 1.045,
		og_max: 1.065,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 4.2,
		abv_max: 5.9,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 40,
		ebc_max: 80
	},
	"16C": {
		code: "16C",
		category: "16",
		name: "Tropical Stout",
		og_min: 1.056,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 5.5,
		abv_max: 8,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 60,
		ebc_max: 100
	},
	"16D": {
		code: "16D",
		category: "16",
		name: "Foreign Extra Stout",
		og_min: 1.056,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 6.3,
		abv_max: 8,
		ibu_min: 50,
		ibu_max: 70,
		ebc_min: 60,
		ebc_max: 100
	},
	"17A": {
		code: "17A",
		category: "17",
		name: "British Strong Ale",
		og_min: 1.055,
		og_max: 1.08,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 5.5,
		abv_max: 8,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 16,
		ebc_max: 44
	},
	"17B": {
		code: "17B",
		category: "17",
		name: "Old Ale",
		og_min: 1.055,
		og_max: 1.088,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 5.5,
		abv_max: 9,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 24,
		ebc_max: 44
	},
	"17C": {
		code: "17C",
		category: "17",
		name: "Wee Heavy",
		og_min: 1.07,
		og_max: 1.13,
		fg_min: 1.018,
		fg_max: 1.04,
		abv_min: 6.5,
		abv_max: 10,
		ibu_min: 17,
		ibu_max: 35,
		ebc_min: 28,
		ebc_max: 60
	},
	"17D": {
		code: "17D",
		category: "17",
		name: "English Barley Wine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.018,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 35,
		ibu_max: 70,
		ebc_min: 20,
		ebc_max: 44
	},
	"18A": {
		code: "18A",
		category: "18",
		name: "Blonde Ale",
		og_min: 1.038,
		og_max: 1.054,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 3.8,
		abv_max: 5.5,
		ibu_min: 15,
		ibu_max: 28,
		ebc_min: 6,
		ebc_max: 14
	},
	"18B": {
		code: "18B",
		category: "18",
		name: "American Pale Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.5,
		abv_max: 6.2,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 10,
		ebc_max: 20
	},
	"19A": {
		code: "19A",
		category: "19",
		name: "American Amber Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.5,
		abv_max: 6.2,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 20,
		ebc_max: 34
	},
	"19B": {
		code: "19B",
		category: "19",
		name: "California Common",
		og_min: 1.048,
		og_max: 1.054,
		fg_min: 1.011,
		fg_max: 1.014,
		abv_min: 4.5,
		abv_max: 5.5,
		ibu_min: 30,
		ibu_max: 45,
		ebc_min: 20,
		ebc_max: 28
	},
	"19C": {
		code: "19C",
		category: "19",
		name: "American Brown Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.3,
		abv_max: 6.2,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 36,
		ebc_max: 60
	},
	"20A": {
		code: "20A",
		category: "20",
		name: "American Porter",
		og_min: 1.05,
		og_max: 1.07,
		fg_min: 1.012,
		fg_max: 1.018,
		abv_min: 4.8,
		abv_max: 6.5,
		ibu_min: 25,
		ibu_max: 50,
		ebc_min: 40,
		ebc_max: 80
	},
	"20B": {
		code: "20B",
		category: "20",
		name: "American Stout",
		og_min: 1.05,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.022,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 35,
		ibu_max: 75,
		ebc_min: 60,
		ebc_max: 100
	},
	"20C": {
		code: "20C",
		category: "20",
		name: "Imperial Stout",
		og_min: 1.075,
		og_max: 1.115,
		fg_min: 1.018,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 50,
		ibu_max: 90,
		ebc_min: 60,
		ebc_max: 100
	},
	"21A": {
		code: "21A",
		category: "21",
		name: "American IPA",
		og_min: 1.056,
		og_max: 1.07,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 5.5,
		abv_max: 7.5,
		ibu_min: 40,
		ibu_max: 70,
		ebc_min: 12,
		ebc_max: 28
	},
	"21B": {
		code: "21B",
		category: "21",
		name: "Specialty IPA",
		og_min: 1.05,
		og_max: 1.085,
		fg_min: 1.008,
		fg_max: 1.02,
		abv_min: 5,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 100,
		ebc_min: 6,
		ebc_max: 80
	},
	"21B1": {
		code: "21B1",
		category: "21",
		name: "New England IPA",
		og_min: 1.06,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 6,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 60,
		ebc_min: 6,
		ebc_max: 16
	},
	"21C": {
		code: "21C",
		category: "21",
		name: "Hazy IPA",
		og_min: 1.06,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 6,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 60,
		ebc_min: 6,
		ebc_max: 16
	},
	"22A": {
		code: "22A",
		category: "22",
		name: "Double IPA",
		og_min: 1.065,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 7.5,
		abv_max: 10,
		ibu_min: 60,
		ibu_max: 120,
		ebc_min: 12,
		ebc_max: 30
	},
	"22B": {
		code: "22B",
		category: "22",
		name: "American Strong Ale",
		og_min: 1.062,
		og_max: 1.09,
		fg_min: 1.014,
		fg_max: 1.024,
		abv_min: 6.3,
		abv_max: 10,
		ibu_min: 50,
		ibu_max: 100,
		ebc_min: 14,
		ebc_max: 44
	},
	"22C": {
		code: "22C",
		category: "22",
		name: "American Barleywine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.016,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 50,
		ibu_max: 100,
		ebc_min: 20,
		ebc_max: 40
	},
	"22D": {
		code: "22D",
		category: "22",
		name: "Wheatwine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.016,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 16,
		ebc_max: 30
	},
	"23A": {
		code: "23A",
		category: "23",
		name: "Berliner Weisse",
		og_min: 1.028,
		og_max: 1.032,
		fg_min: 1.003,
		fg_max: 1.006,
		abv_min: 2.8,
		abv_max: 3.8,
		ibu_min: 3,
		ibu_max: 8,
		ebc_min: 4,
		ebc_max: 6
	},
	"23B": {
		code: "23B",
		category: "23",
		name: "Flanders Red Ale",
		og_min: 1.048,
		og_max: 1.057,
		fg_min: 1.002,
		fg_max: 1.012,
		abv_min: 4.6,
		abv_max: 6.5,
		ibu_min: 10,
		ibu_max: 25,
		ebc_min: 20,
		ebc_max: 34
	},
	"23C": {
		code: "23C",
		category: "23",
		name: "Oud Bruin",
		og_min: 1.04,
		og_max: 1.074,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4,
		abv_max: 8,
		ibu_min: 20,
		ibu_max: 25,
		ebc_min: 30,
		ebc_max: 44
	},
	"23D": {
		code: "23D",
		category: "23",
		name: "Lambic",
		og_min: 1.04,
		og_max: 1.054,
		fg_min: 1.001,
		fg_max: 1.01,
		abv_min: 5,
		abv_max: 6.5,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23E": {
		code: "23E",
		category: "23",
		name: "Gueuze",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1,
		fg_max: 1.006,
		abv_min: 5,
		abv_max: 8,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23F": {
		code: "23F",
		category: "23",
		name: "Fruit Lambic",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1,
		fg_max: 1.01,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23G": {
		code: "23G",
		category: "23",
		name: "Gose",
		og_min: 1.036,
		og_max: 1.056,
		fg_min: 1.006,
		fg_max: 1.01,
		abv_min: 4.2,
		abv_max: 4.8,
		ibu_min: 5,
		ibu_max: 12,
		ebc_min: 6,
		ebc_max: 12
	},
	"24A": {
		code: "24A",
		category: "24",
		name: "Witbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.5,
		abv_max: 5.5,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 4,
		ebc_max: 8
	},
	"24B": {
		code: "24B",
		category: "24",
		name: "Belgian Pale Ale",
		og_min: 1.048,
		og_max: 1.054,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.8,
		abv_max: 5.5,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 16,
		ebc_max: 28
	},
	"24C": {
		code: "24C",
		category: "24",
		name: "Bière de Garde",
		og_min: 1.06,
		og_max: 1.08,
		fg_min: 1.008,
		fg_max: 1.016,
		abv_min: 6,
		abv_max: 8.5,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 12,
		ebc_max: 38
	},
	"25A": {
		code: "25A",
		category: "25",
		name: "Belgian Blond Ale",
		og_min: 1.062,
		og_max: 1.075,
		fg_min: 1.008,
		fg_max: 1.018,
		abv_min: 6,
		abv_max: 7.5,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 8,
		ebc_max: 14
	},
	"25B": {
		code: "25B",
		category: "25",
		name: "Saison",
		og_min: 1.048,
		og_max: 1.065,
		fg_min: 1.002,
		fg_max: 1.008,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 10,
		ebc_max: 20
	},
	"25C": {
		code: "25C",
		category: "25",
		name: "Belgian Golden Strong Ale",
		og_min: 1.07,
		og_max: 1.095,
		fg_min: 1.005,
		fg_max: 1.016,
		abv_min: 7.5,
		abv_max: 10.5,
		ibu_min: 22,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 10
	},
	"26A": {
		code: "26A",
		category: "26",
		name: "Trappist Single",
		og_min: 1.044,
		og_max: 1.054,
		fg_min: 1.004,
		fg_max: 1.01,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 25,
		ibu_max: 45,
		ebc_min: 6,
		ebc_max: 10
	},
	"26B": {
		code: "26B",
		category: "26",
		name: "Belgian Dubbel",
		og_min: 1.062,
		og_max: 1.075,
		fg_min: 1.008,
		fg_max: 1.018,
		abv_min: 6,
		abv_max: 7.6,
		ibu_min: 15,
		ibu_max: 25,
		ebc_min: 20,
		ebc_max: 34
	},
	"26C": {
		code: "26C",
		category: "26",
		name: "Belgian Tripel",
		og_min: 1.075,
		og_max: 1.085,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 7.5,
		abv_max: 9.5,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 8,
		ebc_max: 14
	},
	"26D": {
		code: "26D",
		category: "26",
		name: "Belgian Dark Strong Ale",
		og_min: 1.075,
		og_max: 1.11,
		fg_min: 1.01,
		fg_max: 1.024,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 24,
		ebc_max: 45
	},
	"27A": {
		code: "27A",
		category: "27",
		name: "Grodziskie",
		og_min: 1.028,
		og_max: 1.032,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 2.5,
		abv_max: 3.3,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 12
	},
	"27B": {
		code: "27B",
		category: "27",
		name: "Lichtenhainer",
		og_min: 1.032,
		og_max: 1.04,
		fg_min: 1.004,
		fg_max: 1.008,
		abv_min: 3.5,
		abv_max: 4.7,
		ibu_min: 5,
		ibu_max: 12,
		ebc_min: 6,
		ebc_max: 12
	},
	"27C": {
		code: "27C",
		category: "27",
		name: "Roggenbier",
		og_min: 1.046,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 24,
		ebc_max: 40
	},
	"28A": {
		code: "28A",
		category: "28",
		name: "Brett Beer",
		og_min: 1.03,
		og_max: 1.08,
		fg_min: 1,
		fg_max: 1.012,
		abv_min: 3,
		abv_max: 9,
		ibu_min: 0,
		ibu_max: 50,
		ebc_min: 4,
		ebc_max: 40
	},
	"29A": {
		code: "29A",
		category: "29",
		name: "Fruit Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"30A": {
		code: "30A",
		category: "30",
		name: "Spice, Herb or Vegetable Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"31A": {
		code: "31A",
		category: "31",
		name: "Alternative Grain Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"32A": {
		code: "32A",
		category: "32",
		name: "Classic Style Smoked Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"33A": {
		code: "33A",
		category: "33",
		name: "Wood-Aged Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"34C": {
		code: "34C",
		category: "34",
		name: "Experimental Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 0,
		ibu_max: 100,
		ebc_min: 0,
		ebc_max: 100
	}
};
function findStyle$1(q) {
	if (BJCP$1[q]) return BJCP$1[q];
	const lq = q.toLowerCase();
	for (const s of Object.values(BJCP$1)) if (s.name.toLowerCase().includes(lq)) return s;
	const m = q.match(/\bBJ\s+([0-9A-Z]+)\b/i) ?? q.match(/\b([0-9]{1,2}[A-Z][0-9]?)\b/i);
	if (m) {
		const code = m[1].toUpperCase();
		if (BJCP$1[code]) return BJCP$1[code];
	}
}
function quickCheck(r, style) {
	const issues = [];
	const warnings = [];
	const abv = (r.og - r.fg) * 131.25;
	if (style) {
		if (r.og < style.og_min || r.og > style.og_max) issues.push(`OG ${r.og.toFixed(3)} fuori range (${style.og_min.toFixed(3)}–${style.og_max.toFixed(3)})`);
		if (r.ibu < style.ibu_min || r.ibu > style.ibu_max) issues.push(`IBU ${r.ibu} fuori range (${style.ibu_min}–${style.ibu_max})`);
		if (abv < style.abv_min || abv > style.abv_max) issues.push(`ABV ${abv.toFixed(1)}% fuori range (${style.abv_min}–${style.abv_max}%)`);
		if (r.fg < style.fg_min || r.fg > style.fg_max) warnings.push(`FG ${r.fg.toFixed(3)} fuori range (${style.fg_min.toFixed(3)}–${style.fg_max.toFixed(3)})`);
		if (r.ebc !== void 0 && (r.ebc < style.ebc_min || r.ebc > style.ebc_max)) warnings.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
	}
	const ibuRatio = r.ibu / ((r.og - 1) * 1e3);
	if (ibuRatio < .2) issues.push("Rapporto IBU/OG molto basso (<0.2)");
	else if (ibuRatio > 1.5) issues.push("Rapporto IBU/OG molto alto (>1.5)");
	const totalKg = r.grain_bill.reduce((s, g) => s + g.kg, 0);
	let specPct = 0;
	for (const g of r.grain_bill) {
		const pct = g.percent ?? (totalKg > 0 ? g.kg / totalKg * 100 : 0);
		const n = g.malt.toLowerCase();
		if (n.includes("crystal") || n.includes("caramel") || n.includes("chocolate") || n.includes("black") || n.includes("roast") || n.includes("special") || n.includes("cara")) specPct += pct;
	}
	if (specPct > 25) issues.push(`Malti speciali al ${specPct.toFixed(0)}%`);
	const brewdayMissing = [];
	if (r.mash_water_liters === void 0) brewdayMissing.push("agua de ammostamento (mash_water_liters)");
	if (r.sparge_water_liters === void 0) brewdayMissing.push("agua de lavado (sparge_water_liters)");
	if (r.total_water_liters === void 0) brewdayMissing.push("agua total (total_water_liters)");
	if (r.mash_salts === void 0) brewdayMissing.push("sales de mash (mash_salts)");
	if (r.mash_in_temp_c === void 0) brewdayMissing.push("temperatura de mash-in (mash_in_temp_c)");
	if (r.pre_boil_og === void 0) brewdayMissing.push("gravedad pre-boil (pre_boil_og)");
	if (r.post_boil_og === void 0) brewdayMissing.push("gravedad post-boil (post_boil_og)");
	if (r.boil_time_minutes === void 0) brewdayMissing.push("duración de la ebullición (boil_time_minutes)");
	if (r.fermentation_temp_c === void 0) brewdayMissing.push("temperatura de fermentación (fermentation_temp_c)");
	if (r.primary_days === void 0) brewdayMissing.push("días de fermentación primaria (primary_days)");
	if (r.carbonation_volumes === void 0) brewdayMissing.push("carbonatación (carbonation_volumes)");
	if (r.packaging_volume_liters === void 0) brewdayMissing.push("volumen de envasado (packaging_volume_liters)");
	if (r.bottle_type === void 0) brewdayMissing.push("tipo de botella (bottle_type)");
	if (brewdayMissing.length > 0) issues.push(`Datos de cotización incompletos — faltan: ${brewdayMissing.join(", ")}`);
	if (r.mash_water_liters !== void 0 && r.sparge_water_liters !== void 0 && r.total_water_liters !== void 0) {
		const sum = r.mash_water_liters + r.sparge_water_liters;
		if (Math.abs(sum - r.total_water_liters) > 1) issues.push(`Agua total (${r.total_water_liters}L) ≠ mash (${r.mash_water_liters}L) + sparge (${r.sparge_water_liters}L) = ${sum.toFixed(1)}L`);
	}
	return {
		issues,
		warnings,
		abv,
		ibuRatio,
		specPct
	};
}
function buildLlmReviewPrompt(r) {
	const style = findStyle$1(r.beer_style);
	const { issues, warnings, abv, ibuRatio, specPct } = quickCheck(r, style);
	const recipeSummary = [
		`Ricetta: ${r.recipe_name}`,
		`Stile: ${r.beer_style}${style ? ` (${style.code} — ${style.name}, Cat. ${style.category})` : ""}`,
		`Batch: ${r.batch_size_liters}L | OG: ${r.og.toFixed(3)} | FG: ${r.fg.toFixed(3)} | IBU: ${r.ibu} | ABV: ${abv.toFixed(1)}%`,
		r.ebc !== void 0 ? `EBC: ${r.ebc}` : null,
		r.impianto ? `Impianto: ${r.impianto}` : null,
		r.efficiency_percent !== void 0 ? `Efficienza: ${r.efficiency_percent}%` : null,
		"",
		"── Grist ──",
		...r.grain_bill.map((g) => `  ${g.malt}: ${g.kg}kg${g.percent !== void 0 ? ` (${g.percent}%)` : ""}${g.ebc !== void 0 ? ` [EBC ${g.ebc}]` : ""}${g.note ? ` — ${g.note}` : ""}`),
		"",
		"── Luppolatura ──",
		...r.hop_schedule.map((h) => `  ${h.variety}: ${h.grams}g @ ${h.time_minutes}min (${h.use})${h.aa_percent !== void 0 ? ` AA ${h.aa_percent}%` : ""}${h.ibu_contrib !== void 0 ? ` [${h.ibu_contrib} IBU]` : ""}${h.note ? ` — ${h.note}` : ""}`),
		"",
		`── Lievito ──`,
		`  ${r.yeast.strain}${r.yeast.lab ? ` (${r.yeast.lab})` : ""}${r.yeast.attenuation_percent !== void 0 ? ` att. ${r.yeast.attenuation_percent}%` : ""}`,
		r.fermentation_temp_c !== void 0 ? `  Temperatura: ${r.fermentation_temp_c}°C` : null,
		"",
		r.mash_temp_c !== void 0 || r.mash_steps && r.mash_steps.length > 0 ? "── Mash ──" : null,
		r.mash_temp_c !== void 0 ? `  Single infusion: ${r.mash_temp_c}°C` : null,
		...(r.mash_steps ?? []).map((s) => `  Step: ${s.temperature_c}°C × ${s.time_minutes}min${s.note ? ` (${s.note})` : ""}`),
		"",
		r.water_profile ? "── Acqua ──" : null,
		r.water_profile ? `  Ca:${r.water_profile.ca} Mg:${r.water_profile.mg} Na:${r.water_profile.na} Cl:${r.water_profile.cl} SO₄:${r.water_profile.so4} HCO₃:${r.water_profile.hco3}` : null,
		"",
		r.carbonation_volumes !== void 0 ? `Carbonazione: ${r.carbonation_volumes} vol${r.carbonation_method ? ` (${r.carbonation_method})` : ""}${r.priming_sugar_gl !== void 0 ? ` — ${r.priming_sugar_gl} g/L priming` : ""}` : null,
		r.boil_time_minutes !== void 0 ? `Bollitura: ${r.boil_time_minutes} min` : null,
		r.pre_boil_volume_liters !== void 0 || r.post_boil_volume_liters !== void 0 ? `Volumi: pre-boil ${r.pre_boil_volume_liters ?? "?"}L, post-boil ${r.post_boil_volume_liters ?? "?"}L, fermentatore ${r.fermentation_volume_liters ?? "?"}L, confezionamento ${r.packaging_volume_liters ?? "?"}L` : null,
		"",
		r.mash_water_liters !== void 0 || r.sparge_water_liters !== void 0 || r.total_water_liters !== void 0 ? "── Agua de cotización ──" : null,
		r.mash_water_liters !== void 0 ? `  Agua de ammostamento: ${r.mash_water_liters}L` : null,
		r.sparge_water_liters !== void 0 ? `  Agua de lavado (sparge): ${r.sparge_water_liters}L` : null,
		r.total_water_liters !== void 0 ? `  Agua total: ${r.total_water_liters}L` : null,
		r.mash_salts ? `  Sales mash: ${[
			r.mash_salts.gypsum_g !== void 0 ? `gesso ${r.mash_salts.gypsum_g}g` : null,
			r.mash_salts.cacl2_g !== void 0 ? `CaCl₂ ${r.mash_salts.cacl2_g}g` : null,
			r.mash_salts.epsom_g !== void 0 ? `Epsom ${r.mash_salts.epsom_g}g` : null,
			r.mash_salts.nahco3_g !== void 0 ? `NaHCO₃ ${r.mash_salts.nahco3_g}g` : null,
			r.mash_salts.lactic_acid_ml !== void 0 ? `ácido láctico ${r.mash_salts.lactic_acid_ml}ml` : null
		].filter((x) => x !== null).join(", ")}` : null,
		r.mash_in_temp_c !== void 0 ? `  Mash-in: ${r.mash_in_temp_c}°C` : null,
		r.pre_boil_og !== void 0 ? `  OG pre-boil: ${r.pre_boil_og.toFixed(3)}` : null,
		r.post_boil_og !== void 0 ? `  OG post-boil: ${r.post_boil_og.toFixed(3)}` : null,
		r.primary_days !== void 0 ? `  Fermentación primaria: ${r.primary_days} días` : null,
		r.conditioning_days !== void 0 ? `  Maduración: ${r.conditioning_days} días` : null,
		r.serving_temp_c !== void 0 ? `  Servicio: ${r.serving_temp_c}°C` : null,
		r.bottle_type !== void 0 ? `  Botella: ${r.bottle_type}` : null,
		"",
		r.descrizione ? `Descrizione: ${r.descrizione}` : null,
		r.note ? `Note: ${r.note}` : null
	].filter((x) => x !== null).join("\n");
	const quickReport = [
		`=== QUICK-CHECK DETERMINISTICO ===`,
		`ABV calcolato: ${abv.toFixed(1)}%`,
		`IBU/OG ratio: ${ibuRatio.toFixed(2)}`,
		`Malti speciali: ${specPct.toFixed(1)}%`,
		style ? `Stile BJCP: ${issues.length === 0 ? "✅ OK" : "❌ " + issues.length + " problemi"}` : "Stile BJCP: non trovato",
		...issues.map((i) => `  ❌ ${i}`),
		...warnings.map((w) => `  ⚠️ ${w}`)
	].join("\n");
	return [
		`Sei un revisore brassicolo senior specializzato in homebrewing all grain e`,
		`impianti all-in-one.`,
		``,
		`Devi revisionare criticamente una ricetta di birra. Non devi assecondare la`,
		`ricetta né riscriverla subito. Devi trovare errori, contraddizioni, rischi e`,
		`scelte subottimali.`,
		``,
		`Riceverai:`,
		``,
		`1. la ricetta strutturata;`,
		`2. un quick-check deterministico;`,
		`3. eventuali dati BJCP;`,
		`4. dati ufficiali degli ingredienti e del lievito, quando disponibili.`,
		``,
		`Valuta separatamente:`,
		``,
		`- validità matematica;`,
		`- coerenza dei volumi;`,
		`- compatibilità con l'impianto;`,
		`- mash e filtrabilità;`,
		`- grist;`,
		`- luppolatura;`,
		`- lievito e fermentazione;`,
		`- acqua;`,
		`- carbonazione e sicurezza;`,
		`- conformità stilistica;`,
		`- plausibilità sensoriale;`,
		`- chiarezza e riproducibilità della procedura;`,
		`- attendibilità delle affermazioni storiche o tecniche.`,
		``,
		`Verifica che la ricetta contenga TUTTI los datos necesarios para seguir la`,
		`cotización de principio a fin, hasta el embotellado: agua total, agua de`,
		`ammostamento y de lavado (sparge), sales de mash y ácido láctico,`,
		`temperatura de mash-in, gravedad pre-boil y post-boil, duración de la`,
		`ebullición, temperatura y días de fermentación, carbonatación y tipo de`,
		`botella. Señala cualquier dato faltante como critical_issue o warning.`,
		``,
		`Regole:`,
		``,
		`- Non considerare corretta una scelta solo perché è comune.`,
		`- Non inventare dati mancanti.`,
		`- Distingui tra errore critico, warning e scelta opzionale.`,
		`- Distingui validità tecnica da conformità BJCP.`,
		`- Se una ricetta è creativa, non penalizzarla automaticamente: verifica però`,
		`  che sia classificata correttamente.`,
		`- Non ripetere i soli errori già riportati dal quick-check deterministico:`,
		`  spiegane l'impatto pratico.`,
		`- Segnala contraddizioni tra campi strutturati e testo descrittivo.`,
		`- Contesta affermazioni assolute non supportate.`,
		`- Proponi correzioni minime prima di ridisegnare l'intera ricetta.`,
		`- Ogni correzione deve indicare cosa cambia e perché.`,
		``,
		`Restituisci esclusivamente JSON conforme allo schema richiesto.`,
		``,
		`=== RICETTA ===`,
		recipeSummary,
		``,
		`=== DATI BJCP ===`,
		style ? `${style.code} — ${style.name} (Cat. ${style.category}): OG ${style.og_min.toFixed(3)}-${style.og_max.toFixed(3)}, FG ${style.fg_min.toFixed(3)}-${style.fg_max.toFixed(3)}, ABV ${style.abv_min}-${style.abv_max}%, IBU ${style.ibu_min}-${style.ibu_max}, EBC ${style.ebc_min}-${style.ebc_max}` : "Stile non trovato nel database BJCP.",
		``,
		quickReport
	].join("\n");
}
const OUTPUT_SCHEMA = {
	type: "object",
	properties: {
		overall_status: {
			type: "string",
			enum: [
				"valid",
				"needs_revision",
				"invalid"
			],
			description: "Giudizio complessivo"
		},
		technical_validity: {
			type: "string",
			enum: [
				"valid",
				"questionable",
				"invalid"
			],
			description: "Validità tecnica/matematica"
		},
		style_conformity: {
			type: "string",
			enum: [
				"in_style",
				"borderline",
				"out_of_style",
				"creative"
			],
			description: "Conformità BJCP"
		},
		confidence: {
			type: "number",
			minimum: 0,
			maximum: 1,
			description: "Confidenza del revisore (0-1)"
		},
		critical_issues: {
			type: "array",
			items: {
				type: "object",
				properties: {
					code: {
						type: "string",
						description: "Codice errore (es. MASH_PLAN_CONTRADICTION)"
					},
					area: {
						type: "string",
						description: "Area: mash, grist, hops, yeast, water, volumes, carbonation, style, procedure, safety"
					},
					finding: {
						type: "string",
						description: "Descrizione del problema"
					},
					impact: {
						type: "string",
						description: "Impatto pratico"
					},
					recommended_change: {
						type: "string",
						description: "Correzione proposta"
					}
				},
				required: [
					"code",
					"area",
					"finding",
					"impact",
					"recommended_change"
				]
			}
		},
		warnings: {
			type: "array",
			items: {
				type: "object",
				properties: {
					code: { type: "string" },
					area: { type: "string" },
					finding: { type: "string" },
					suggestion: { type: "string" }
				},
				required: [
					"code",
					"area",
					"finding",
					"suggestion"
				]
			}
		},
		sensory_assessment: {
			type: "object",
			properties: {
				expected_balance: {
					type: "string",
					description: "Bilanciamento atteso"
				},
				main_risk: {
					type: "string",
					description: "Rischio sensoriale principale"
				},
				coherence: {
					type: "string",
					enum: [
						"excellent",
						"good",
						"questionable",
						"contradictory"
					]
				}
			},
			required: [
				"expected_balance",
				"main_risk",
				"coherence"
			]
		},
		style_assessment: {
			type: "object",
			properties: {
				declared_style: { type: "string" },
				classification: {
					type: "string",
					enum: [
						"in_style",
						"borderline",
						"out_of_style",
						"creative"
					]
				},
				deviations: {
					type: "array",
					items: { type: "string" }
				}
			},
			required: [
				"declared_style",
				"classification",
				"deviations"
			]
		},
		recommended_actions: {
			type: "array",
			items: {
				type: "object",
				properties: {
					priority: {
						type: "integer",
						minimum: 1
					},
					action: { type: "string" },
					detail: { type: "string" }
				},
				required: ["priority", "action"]
			}
		}
	},
	required: [
		"overall_status",
		"technical_validity",
		"style_conformity",
		"confidence",
		"critical_issues",
		"warnings",
		"sensory_assessment",
		"style_assessment",
		"recommended_actions"
	]
};
var RecipeValidatorTool = class {
	name = "recipe_validator";
	description = "Produces a complete LLM review prompt for deep qualitative analysis of a beer recipe. Pass the structured recipe data (as returned by yaml_validator or built manually) to get: recipe summary, BJCP style data, quick deterministic check, the LLM review prompt, and the expected JSON output schema. Use AFTER yaml_validator for deterministic validation.";
	parameters = toInputJsonSchema(RecipeValidatorInputSchema);
	resolveExecution(args) {
		return {
			description: `Build LLM review prompt: ${args.recipe_name}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const style = findStyle$1(args.beer_style);
			const llmPrompt = buildLlmReviewPrompt(args);
			const fullOutput = [
				`**Revisione LLM per: ${args.recipe_name}**`,
				style ? `Stile: ${style.code} — ${style.name} (Cat. ${style.category})` : `Stile "${args.beer_style}" non trovato nel database BJCP.`,
				"",
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				"📋 LLM REVIEW PROMPT (da inoltrare al modello)",
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				"",
				llmPrompt,
				"",
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				"📐 OUTPUT SCHEMA (JSON atteso)",
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				"",
				"```json",
				JSON.stringify(OUTPUT_SCHEMA, null, 2),
				"```"
			].join("\n");
			return Promise.resolve({ output: fullOutput });
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
};
registerTool(RecipeValidatorTool);

//#endregion
//#region src/brewing/inventory-search.ts
/**
* Inventory search — search a virtual inventory of malts, hops, and yeasts.
*/
const InventorySearchInputSchema = object({
	query: string().describe("Search query."),
	category: _enum([
		"malt",
		"hop",
		"yeast",
		"all"
	]).default("all"),
	include_unavailable: boolean().default(false)
});
const INVENTORY = [
	{
		name: "Pilsner Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "3-4",
			origin: "Germany",
			usage: "Up to 100%"
		},
		substitutes: ["Pale Ale Malt", "Vienna Malt"]
	},
	{
		name: "Pale Ale Malt (Crisp)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "5-7",
			origin: "UK",
			usage: "Up to 100%"
		},
		substitutes: ["Maris Otter", "Pilsner Malt"]
	},
	{
		name: "Maris Otter (Crisp)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "4-6",
			origin: "UK",
			usage: "Up to 100%"
		},
		substitutes: ["Pale Ale Malt", "Golden Promise"]
	},
	{
		name: "Vienna Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "6-9",
			origin: "Germany",
			usage: "Up to 100%"
		},
		substitutes: ["Munich Light", "Pale Ale Malt"]
	},
	{
		name: "Munich Malt Light (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "15-25",
			origin: "Germany",
			usage: "Up to 100%"
		},
		substitutes: ["Vienna Malt", "Munich Dark"]
	},
	{
		name: "Wheat Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "3-5",
			origin: "Germany",
			usage: "Up to 70%"
		},
		substitutes: ["Pale Wheat Malt", "Flaked Wheat"]
	},
	{
		name: "Rye Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Base",
			ebc: "4-10",
			origin: "Germany",
			usage: "Up to 60%"
		},
		substitutes: ["Flaked Rye", "Wheat Malt"]
	},
	{
		name: "CaraPils (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "3-5",
			origin: "Germany",
			usage: "Up to 10%"
		},
		substitutes: ["Dextrin Malt", "Flaked Barley"]
	},
	{
		name: "CaraHell (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "20-30",
			origin: "Germany",
			usage: "Up to 15%"
		},
		substitutes: ["Crystal 10L", "CaraAmber"]
	},
	{
		name: "CaraAmber (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "60-80",
			origin: "Germany",
			usage: "Up to 15%"
		},
		substitutes: ["Crystal 30L", "CaraRed"]
	},
	{
		name: "CaraMunich I (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "80-100",
			origin: "Germany",
			usage: "Up to 15%"
		},
		substitutes: ["Crystal 60L", "CaraMunich II"]
	},
	{
		name: "Crystal 60L (Briess)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "120",
			origin: "USA",
			usage: "Up to 10%"
		},
		substitutes: ["CaraMunich I", "Crystal 80L"]
	},
	{
		name: "Crystal 120L (Briess)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "240",
			origin: "USA",
			usage: "Up to 5%"
		},
		substitutes: ["CaraMunich III", "Special B"]
	},
	{
		name: "Special B (Dingemans)",
		category: "malt",
		available: true,
		specs: {
			type: "Crystal",
			ebc: "280-350",
			origin: "Belgium",
			usage: "Up to 5%"
		},
		substitutes: ["Crystal 120L", "Chocolate Malt"]
	},
	{
		name: "Chocolate Malt (Crisp)",
		category: "malt",
		available: true,
		specs: {
			type: "Roasted",
			ebc: "900-1100",
			origin: "UK",
			usage: "Up to 10%"
		},
		substitutes: ["Pale Chocolate", "Black Patent"]
	},
	{
		name: "Black Patent Malt (Crisp)",
		category: "malt",
		available: true,
		specs: {
			type: "Roasted",
			ebc: "1300-1500",
			origin: "UK",
			usage: "Up to 5%"
		},
		substitutes: ["Roasted Barley", "Chocolate Malt"]
	},
	{
		name: "Roasted Barley (Briess)",
		category: "malt",
		available: true,
		specs: {
			type: "Roasted",
			ebc: "600-800",
			origin: "USA",
			usage: "Up to 5%"
		},
		substitutes: ["Black Patent", "Chocolate Malt"]
	},
	{
		name: "Carafa Special I (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Roasted",
			ebc: "800-1000",
			origin: "Germany",
			usage: "Up to 5%"
		},
		substitutes: ["Chocolate Malt", "Black Patent"]
	},
	{
		name: "Flaked Barley",
		category: "malt",
		available: true,
		specs: {
			type: "Adjunct",
			ebc: "3",
			origin: "Various",
			usage: "Up to 20%"
		},
		substitutes: ["Flaked Oats", "Flaked Wheat"]
	},
	{
		name: "Flaked Oats",
		category: "malt",
		available: true,
		specs: {
			type: "Adjunct",
			ebc: "2",
			origin: "Various",
			usage: "Up to 30%"
		},
		substitutes: ["Oat Malt", "Flaked Barley"]
	},
	{
		name: "Flaked Wheat",
		category: "malt",
		available: true,
		specs: {
			type: "Adjunct",
			ebc: "2",
			origin: "Various",
			usage: "Up to 40%"
		},
		substitutes: ["Wheat Malt", "Flaked Barley"]
	},
	{
		name: "Acidulated Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Specialty",
			ebc: "3-6",
			origin: "Germany",
			usage: "Up to 10%"
		},
		substitutes: ["Lactic Acid", "Phosphoric Acid"]
	},
	{
		name: "Smoked Malt (Weyermann)",
		category: "malt",
		available: true,
		specs: {
			type: "Specialty",
			ebc: "4-8",
			origin: "Germany",
			usage: "Up to 100%"
		},
		substitutes: ["Rauchmalz", "Peated Malt"]
	},
	{
		name: "Citra (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "11-13%",
			origin: "USA",
			characteristics: "Tropical, citrus, grapefruit"
		},
		substitutes: ["Mosaic", "Galaxy"]
	},
	{
		name: "Mosaic (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "11-14%",
			origin: "USA",
			characteristics: "Blueberry, tropical, earthy"
		},
		substitutes: ["Citra", "Simcoe"]
	},
	{
		name: "Simcoe (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Dual",
			aa: "12-14%",
			origin: "USA",
			characteristics: "Pine, citrus, passionfruit"
		},
		substitutes: ["Citra", "Chinook"]
	},
	{
		name: "Cascade (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "5-7%",
			origin: "USA",
			characteristics: "Grapefruit, floral, spicy"
		},
		substitutes: ["Centennial", "Amarillo"]
	},
	{
		name: "Centennial (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Dual",
			aa: "9-11%",
			origin: "USA",
			characteristics: "Floral, citrus, pine"
		},
		substitutes: ["Cascade", "Chinook"]
	},
	{
		name: "Chinook (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Dual",
			aa: "12-14%",
			origin: "USA",
			characteristics: "Pine, spice, grapefruit"
		},
		substitutes: ["Simcoe", "Columbus"]
	},
	{
		name: "Magnum (Germany)",
		category: "hop",
		available: true,
		specs: {
			type: "Bittering",
			aa: "12-14%",
			origin: "Germany",
			characteristics: "Clean, smooth bittering"
		},
		substitutes: ["Warrior", "Herkules"]
	},
	{
		name: "Hallertau Mittelfrüh (Germany)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "3-5%",
			origin: "Germany",
			characteristics: "Floral, spicy, noble"
		},
		substitutes: ["Hallertau Hersbrucker", "Saaz"]
	},
	{
		name: "Saaz (Czech)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "3-4%",
			origin: "Czech Republic",
			characteristics: "Spicy, earthy, noble"
		},
		substitutes: ["Tettnang", "Hallertau"]
	},
	{
		name: "Fuggles (UK)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "4-5%",
			origin: "UK",
			characteristics: "Earthy, woody, mild"
		},
		substitutes: ["East Kent Goldings", "Willamette"]
	},
	{
		name: "East Kent Goldings (UK)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "5-6%",
			origin: "UK",
			characteristics: "Floral, honey, earthy"
		},
		substitutes: ["Fuggles", "Willamette"]
	},
	{
		name: "Amarillo (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "8-10%",
			origin: "USA",
			characteristics: "Orange, floral, citrus"
		},
		substitutes: ["Cascade", "Centennial"]
	},
	{
		name: "Galaxy (Australia)",
		category: "hop",
		available: false,
		specs: {
			type: "Aroma",
			aa: "13-15%",
			origin: "Australia",
			characteristics: "Passionfruit, peach, citrus"
		},
		substitutes: ["Citra", "Mosaic"]
	},
	{
		name: "El Dorado (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "14-16%",
			origin: "USA",
			characteristics: "Tropical, watermelon, stone fruit"
		},
		substitutes: ["Citra", "Mosaic"]
	},
	{
		name: "Strata (USA)",
		category: "hop",
		available: true,
		specs: {
			type: "Aroma",
			aa: "11-13%",
			origin: "USA",
			characteristics: "Passionfruit, grapefruit, dank"
		},
		substitutes: ["Citra", "Mosaic"]
	},
	{
		name: "SafAle US-05",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Dry",
			attenuation: "78-82%",
			temp_range: "15-24°C",
			flocculation: "Medium"
		},
		substitutes: ["WLP001", "Wyeast 1056"]
	},
	{
		name: "SafAle S-04",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Dry",
			attenuation: "72-76%",
			temp_range: "15-24°C",
			flocculation: "High"
		},
		substitutes: ["WLP002", "Wyeast 1098"]
	},
	{
		name: "SafLager W-34/70",
		category: "yeast",
		available: true,
		specs: {
			type: "Lager",
			form: "Dry",
			attenuation: "80-84%",
			temp_range: "9-15°C",
			flocculation: "High"
		},
		substitutes: ["WLP830", "Wyeast 2124"]
	},
	{
		name: "SafBrew WB-06",
		category: "yeast",
		available: true,
		specs: {
			type: "Wheat",
			form: "Dry",
			attenuation: "86-90%",
			temp_range: "15-24°C",
			flocculation: "Low"
		},
		substitutes: ["WLP300", "Wyeast 3068"]
	},
	{
		name: "SafBrew T-58",
		category: "yeast",
		available: true,
		specs: {
			type: "Specialty",
			form: "Dry",
			attenuation: "72-78%",
			temp_range: "15-24°C",
			flocculation: "Medium"
		},
		substitutes: ["WLP500", "Wyeast 1214"]
	},
	{
		name: "SafBrew BE-256",
		category: "yeast",
		available: true,
		specs: {
			type: "Abbey",
			form: "Dry",
			attenuation: "78-82%",
			temp_range: "15-24°C",
			flocculation: "Medium"
		},
		substitutes: ["WLP530", "Wyeast 1762"]
	},
	{
		name: "WLP001 California Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Liquid",
			attenuation: "73-80%",
			temp_range: "18-22°C",
			flocculation: "Medium"
		},
		substitutes: ["US-05", "Wyeast 1056"]
	},
	{
		name: "WLP002 English Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Liquid",
			attenuation: "63-70%",
			temp_range: "18-21°C",
			flocculation: "Very High"
		},
		substitutes: ["S-04", "Wyeast 1098"]
	},
	{
		name: "WLP004 Irish Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Liquid",
			attenuation: "69-74%",
			temp_range: "18-21°C",
			flocculation: "Medium"
		},
		substitutes: ["Wyeast 1084", "S-04"]
	},
	{
		name: "WLP300 Hefeweizen Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Wheat",
			form: "Liquid",
			attenuation: "73-77%",
			temp_range: "18-24°C",
			flocculation: "Low"
		},
		substitutes: ["WB-06", "WLP041"]
	},
	{
		name: "WLP400 Belgian Wit Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Wheat",
			form: "Liquid",
			attenuation: "74-78%",
			temp_range: "18-22°C",
			flocculation: "Low"
		},
		substitutes: ["WB-06", "WLP300"]
	},
	{
		name: "WLP500 Trappist Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Abbey",
			form: "Liquid",
			attenuation: "75-80%",
			temp_range: "18-24°C",
			flocculation: "Medium"
		},
		substitutes: ["BE-256", "Wyeast 1214"]
	},
	{
		name: "WLP565 Belgian Saison I",
		category: "yeast",
		available: true,
		specs: {
			type: "Saison",
			form: "Liquid",
			attenuation: "65-75%",
			temp_range: "20-25°C",
			flocculation: "Low"
		},
		substitutes: ["Wyeast 3711", "WLP566"]
	},
	{
		name: "WLP800 Pilsner Lager",
		category: "yeast",
		available: true,
		specs: {
			type: "Lager",
			form: "Liquid",
			attenuation: "72-78%",
			temp_range: "10-14°C",
			flocculation: "Medium-High"
		},
		substitutes: ["W-34/70", "WLP830"]
	},
	{
		name: "WLP830 German Lager",
		category: "yeast",
		available: true,
		specs: {
			type: "Lager",
			form: "Liquid",
			attenuation: "74-79%",
			temp_range: "10-14°C",
			flocculation: "Medium"
		},
		substitutes: ["W-34/70", "WLP800"]
	},
	{
		name: "Kveik Voss",
		category: "yeast",
		available: true,
		specs: {
			type: "Kveik",
			form: "Dry",
			attenuation: "75-82%",
			temp_range: "20-40°C",
			flocculation: "Medium"
		},
		substitutes: ["Kveik Hornindal", "Kveik Lutra"]
	},
	{
		name: "Kveik Hornindal",
		category: "yeast",
		available: true,
		specs: {
			type: "Kveik",
			form: "Dry",
			attenuation: "75-82%",
			temp_range: "20-40°C",
			flocculation: "High"
		},
		substitutes: ["Kveik Voss", "Kveik Lutra"]
	},
	{
		name: "Kveik Lutra",
		category: "yeast",
		available: true,
		specs: {
			type: "Kveik",
			form: "Dry",
			attenuation: "75-82%",
			temp_range: "20-40°C",
			flocculation: "Medium"
		},
		substitutes: ["Kveik Voss", "Kveik Hornindal"]
	},
	{
		name: "Lallemand WildBrew Philly Sour",
		category: "yeast",
		available: true,
		specs: {
			type: "Sour",
			form: "Dry",
			attenuation: "75-85%",
			temp_range: "20-30°C",
			flocculation: "High"
		},
		substitutes: ["WLP677", "Omega Lactobacillus Blend"]
	},
	{
		name: "Wyeast 1056 American Ale",
		category: "yeast",
		available: true,
		specs: {
			type: "Ale",
			form: "Liquid",
			attenuation: "73-77%",
			temp_range: "15-22°C",
			flocculation: "Medium"
		},
		substitutes: ["US-05", "WLP001"]
	},
	{
		name: "Wyeast 3068 Weihenstephan Weizen",
		category: "yeast",
		available: true,
		specs: {
			type: "Wheat",
			form: "Liquid",
			attenuation: "73-77%",
			temp_range: "18-24°C",
			flocculation: "Low"
		},
		substitutes: ["WLP300", "WB-06"]
	},
	{
		name: "Wyeast 3711 French Saison",
		category: "yeast",
		available: true,
		specs: {
			type: "Saison",
			form: "Liquid",
			attenuation: "77-83%",
			temp_range: "18-25°C",
			flocculation: "Low"
		},
		substitutes: ["WLP565", "WLP566"]
	},
	{
		name: "WLP677 Lactobacillus",
		category: "yeast",
		available: true,
		specs: {
			type: "Sour",
			form: "Liquid",
			attenuation: "N/A",
			temp_range: "20-40°C",
			flocculation: "N/A"
		},
		substitutes: ["Wyeast 5335", "Omega Lacto Blend"]
	},
	{
		name: "WLP650 Brettanomyces Bruxellensis",
		category: "yeast",
		available: true,
		specs: {
			type: "Wild",
			form: "Liquid",
			attenuation: "N/A",
			temp_range: "18-25°C",
			flocculation: "N/A"
		},
		substitutes: ["Wyeast 5112", "Omega Brett Blend"]
	}
];
var InventorySearchTool = class {
	name = "inventory_search";
	description = "Search a virtual inventory of brewing ingredients (malts, hops, yeasts). Filter by category, check availability, find substitutes, and get technical specifications.";
	parameters = toInputJsonSchema(InventorySearchInputSchema);
	resolveExecution(args) {
		return {
			description: `Inventory search: ${args.query}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const q = args.query.toLowerCase();
			const cat = args.category ?? "all";
			const results = INVENTORY.filter((item) => {
				if (cat !== "all" && item.category !== cat) return false;
				if (!args.include_unavailable && !item.available) return false;
				return item.name.toLowerCase().includes(q) || Object.values(item.specs).some((v) => v.toLowerCase().includes(q)) || item.substitutes?.some((s) => s.toLowerCase().includes(q));
			});
			if (results.length === 0) return Promise.resolve({ output: `Nessun risultato per "${args.query}".` });
			const lines = [`**${results.length} risultato/i per "${args.query}"**`, ""];
			for (const item of results.slice(0, 20)) {
				const status = item.available ? "✅ Disponibile" : "❌ Non disponibile";
				lines.push(`**${item.name}** (${item.category}) — ${status}`);
				for (const [k, v] of Object.entries(item.specs)) lines.push(`  ${k}: ${v}`);
				if (item.substitutes?.length) lines.push(`  Sostituti: ${item.substitutes.join(", ")}`);
				lines.push("");
			}
			if (results.length > 20) lines.push(`... e altri ${results.length - 20} risultati.`);
			return Promise.resolve({ output: lines.join("\n") });
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
};
registerTool(InventorySearchTool);

//#endregion
//#region src/brewing/data-root.ts
/**
* Shared data-root resolution for the brewmaster plugin.
*
* Persistent brewing data (memory, inventory, brewday logs) is stored per-user
* inside the connected user's chroot under `.brewing-data`, so a multi-user
* server keeps each user's data separate. When no user is attached to the tool
* call (e.g. running outside the kap-server), it falls back to the legacy
* `~/.kimi-code/brewing` location.
*/
function userChroot(args) {
	if (args === null || typeof args !== "object") return void 0;
	const user = args["_kimi_user"];
	if (user === null || typeof user !== "object") return void 0;
	const chroot = user["chroot"];
	return typeof chroot === "string" && chroot.length > 0 ? chroot : void 0;
}
function dataRoot(args) {
	const chroot = userChroot(args);
	if (chroot !== void 0) return join(chroot, ".brewing-data");
	return join(homedir(), ".kimi-code", "brewing");
}

//#endregion
//#region src/brewing/inventory-manager.ts
/**
* Inventory manager tool — persistent stock management for brewing raw materials.
*
* Manages a persistent inventory of brewing ingredients (malts, hops, yeasts,
* spices, adjuncts, water salts, etc.) stored per-user under the data root
* (`.brewing-data` inside the user's chroot, else `~/.kimi-code/brewing`).
*
* Each item tracks: name, category, quantity (with unit), purchase date, cost,
* supplier, best-before / expiry date, lot, storage notes, and free notes.
*
* Supported operations:
*   - add      : add a new item (or restock an existing one)
*   - remove   : remove an item entirely
*   - adjust   : add/subtract quantity to/from an existing item
*   - list     : list items, optionally filtered by category / expiring / low stock
*   - search   : search by name or notes
*   - stats    : summary of stock value, expiring items, low stock
*
* This helps when elaborating a recipe: the agent can see what is already on
* hand, what needs to be bought, and what is about to expire.
*/
const INVENTORY_CATEGORIES = [
	"malt",
	"hop",
	"yeast",
	"spice",
	"adjunct",
	"water_salt",
	"sugar",
	"other"
];
function inventoryPath(root) {
	return join(root, "inventory.json");
}
function ensureDir$1(root) {
	const dir = dirname(inventoryPath(root));
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
function loadItems(root) {
	const path = inventoryPath(root);
	if (!existsSync(path)) return [];
	try {
		const raw = readFileSync(path, "utf-8");
		const parsed = JSON.parse(raw);
		if (parsed.version === 1 && Array.isArray(parsed.items)) return parsed.items;
		return [];
	} catch {
		return [];
	}
}
function saveItems(root, items) {
	ensureDir$1(root);
	const file = {
		version: 1,
		items
	};
	writeFileSync(inventoryPath(root), JSON.stringify(file, null, 2), "utf-8");
}
function makeId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeName$2(name) {
	return name.trim().toLowerCase().replace(/\s+/g, " ");
}
function findItem(items, name) {
	const target = normalizeName$2(name);
	return items.find((i) => normalizeName$2(i.name) === target);
}
function todayIso() {
	return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function daysUntil(dateIso) {
	const target = (/* @__PURE__ */ new Date(`${dateIso}T00:00:00`)).getTime();
	const now = (/* @__PURE__ */ new Date(`${todayIso()}T00:00:00`)).getTime();
	return Math.round((target - now) / 864e5);
}
function formatQty(item) {
	return `${item.quantity} ${item.unit}`;
}
function formatCost(item) {
	if (item.cost === void 0) return "—";
	return `€${item.cost.toFixed(2)}/${item.unit}`;
}
function expiryLabel(item) {
	if (!item.bestBefore) return "";
	const d = daysUntil(item.bestBefore);
	if (d < 0) return ` ⚠️ SCADUTO da ${-d}g`;
	if (d === 0) return " ⚠️ SCADE OGGI";
	if (d <= 30) return ` ⏳ scade tra ${d}g`;
	return "";
}
function itemToLine(item) {
	const parts = [`**${item.name}** [${item.category}] — ${formatQty(item)}`];
	if (item.cost !== void 0) parts.push(`Costo: ${formatCost(item)}`);
	if (item.purchaseDate) parts.push(`Acquisto: ${item.purchaseDate}`);
	if (item.supplier) parts.push(`Fornitore: ${item.supplier}`);
	if (item.bestBefore) parts.push(`Scadenza: ${item.bestBefore}${expiryLabel(item)}`);
	if (item.lot) parts.push(`Lotto: ${item.lot}`);
	if (item.storage) parts.push(`Conservazione: ${item.storage}`);
	if (item.notes) parts.push(`Note: ${item.notes}`);
	return parts.join(" | ");
}
const InventoryManagerInputSchema = object({
	operation: _enum([
		"add",
		"remove",
		"adjust",
		"list",
		"search",
		"stats"
	]).describe("Operazione da eseguire: add (aggiungi/riapprovvigiona), remove (elimina), adjust (aggiungi/sottrai quantità), list (elenca), search (cerca), stats (riepilogo)."),
	name: string().optional().describe("Nome dell'ingrediente (es. \"Pilsner Malt Weyermann\", \"Citra\"). Obbligatorio per add/remove/adjust/search."),
	category: _enum(INVENTORY_CATEGORIES).optional().describe("Tipologia merce: malt, hop, yeast, spice, adjunct, water_salt, sugar, other."),
	quantity: number().optional().describe("Quantità. Per add: quantità iniziale o da aggiungere. Per adjust: delta (positivo aggiunge, negativo sottrae)."),
	unit: string().optional().describe("Unità di misura (kg, g, pcs, packets, L, ml...). Default \"kg\" per malti/adjunct, \"g\" per luppoli/spezie, \"pcs\" per lieviti."),
	purchaseDate: string().optional().describe("Data di acquisto in formato YYYY-MM-DD."),
	cost: number().optional().describe("Costo unitario in EUR (per unità)."),
	supplier: string().optional().describe("Fornitore / negozio."),
	bestBefore: string().optional().describe("Data di scadenza in formato YYYY-MM-DD."),
	lot: string().optional().describe("Numero di lotto / partita."),
	storage: string().optional().describe("Note di conservazione (frigo, buio, freezer...)."),
	notes: string().optional().describe("Note libere."),
	expiringWithinDays: number().optional().describe("Per list: mostra solo gli articoli che scadono entro questo numero di giorni."),
	lowStockBelow: number().optional().describe("Per list: mostra solo gli articoli con quantità inferiore a questo valore."),
	includeExpired: boolean().default(false).describe("Per list: include anche gli articoli scaduti. Default false.")
});
var InventoryManagerTool = class {
	name = "inventory_manager";
	description = "Gestisci l'inventario persistente delle materie prime brassicole (malti, luppoli, lieviti, spezie, adjunct, sali acqua, zuccheri). Aggiungi/rimuovi/regola quantità, elenca, cerca e ottieni riepiloghi di scorte, valore e scadenze. I dati sono salvati per utente in .brewing-data dentro la chroot dell'utente (fallback ~/.kimi-code/brewing).";
	parameters = toInputJsonSchema(InventoryManagerInputSchema);
	resolveExecution(args) {
		const root = dataRoot(args);
		return {
			description: `Inventory ${args.operation}${args.name ? `: ${args.name}` : ""}`,
			approvalRule: this.name,
			execute: () => this.execute(args, root)
		};
	}
	execute(args, root) {
		try {
			switch (args.operation) {
				case "add": return Promise.resolve(this.add(args, root));
				case "remove": return Promise.resolve(this.remove(args, root));
				case "adjust": return Promise.resolve(this.adjust(args, root));
				case "list": return Promise.resolve(this.list(args, root));
				case "search": return Promise.resolve(this.search(args, root));
				case "stats": return Promise.resolve(this.stats(root));
			}
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
	add(args, root) {
		const name = args.name?.trim();
		if (!name) return {
			isError: true,
			output: "Specifica un nome per l'articolo (campo \"name\")."
		};
		const items = loadItems(root);
		const existing = findItem(items, name);
		if (existing) {
			const delta = args.quantity ?? 0;
			existing.quantity += delta;
			if (args.category) existing.category = args.category;
			if (args.unit) existing.unit = args.unit;
			if (args.purchaseDate) existing.purchaseDate = args.purchaseDate;
			if (args.cost !== void 0) existing.cost = args.cost;
			if (args.supplier) existing.supplier = args.supplier;
			if (args.bestBefore) existing.bestBefore = args.bestBefore;
			if (args.lot) existing.lot = args.lot;
			if (args.storage) existing.storage = args.storage;
			if (args.notes) existing.notes = args.notes;
			existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
			saveItems(root, items);
			return { output: `Riapprovvigionato **${existing.name}**: ora ${formatQty(existing)} (aggiunti ${delta} ${existing.unit}).\n${itemToLine(existing)}` };
		}
		const category = args.category ?? inferCategory(name);
		const unit = args.unit ?? defaultUnit(category);
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const item = {
			id: makeId(),
			name,
			category,
			quantity: args.quantity ?? 0,
			unit,
			purchaseDate: args.purchaseDate,
			cost: args.cost,
			supplier: args.supplier,
			bestBefore: args.bestBefore,
			lot: args.lot,
			storage: args.storage,
			notes: args.notes,
			createdAt: now,
			updatedAt: now
		};
		items.push(item);
		saveItems(root, items);
		return { output: `Aggiunto **${item.name}** [${item.category}] — ${formatQty(item)}.\n${itemToLine(item)}` };
	}
	remove(args, root) {
		const name = args.name?.trim();
		if (!name) return {
			isError: true,
			output: "Specifica il nome dell'articolo da rimuovere (campo \"name\")."
		};
		const items = loadItems(root);
		const idx = items.findIndex((i) => normalizeName$2(i.name) === normalizeName$2(name));
		if (idx < 0) return {
			isError: true,
			output: `Nessun articolo trovato con nome "${name}".`
		};
		const [removed] = items.splice(idx, 1);
		saveItems(root, items);
		return { output: `Rimosso **${removed.name}** [${removed.category}] dall'inventario.` };
	}
	adjust(args, root) {
		const name = args.name?.trim();
		if (!name) return {
			isError: true,
			output: "Specifica il nome dell'articolo da regolare (campo \"name\")."
		};
		if (args.quantity === void 0) return {
			isError: true,
			output: "Specifica il delta di quantità (campo \"quantity\", positivo per aggiungere, negativo per sottrarre)."
		};
		const items = loadItems(root);
		const item = findItem(items, name);
		if (!item) return {
			isError: true,
			output: `Nessun articolo trovato con nome "${name}".`
		};
		item.quantity += args.quantity;
		if (item.quantity < 0) item.quantity = 0;
		item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		saveItems(root, items);
		const direction = args.quantity >= 0 ? "aggiunti" : "sottratti";
		const status = item.quantity === 0 ? " ⚠️ ESAURITO" : "";
		return { output: `Regolato **${item.name}**: ${direction} ${Math.abs(args.quantity)} ${item.unit} → ora ${formatQty(item)}${status}.\n${itemToLine(item)}` };
	}
	list(args, root) {
		let items = loadItems(root);
		if (items.length === 0) return { output: "Inventario vuoto. Usa l'operazione \"add\" per aggiungere materie prime." };
		if (args.category) items = items.filter((i) => i.category === args.category);
		if (args.expiringWithinDays !== void 0) items = items.filter((i) => i.bestBefore && daysUntil(i.bestBefore) <= args.expiringWithinDays);
		if (args.lowStockBelow !== void 0) items = items.filter((i) => i.quantity < args.lowStockBelow);
		if (!args.includeExpired) items = items.filter((i) => !i.bestBefore || daysUntil(i.bestBefore) >= 0);
		if (items.length === 0) return { output: "Nessun articolo corrisponde ai filtri specificati." };
		const sorted = [...items].sort((a, b) => {
			const cat = a.category.localeCompare(b.category);
			return cat !== 0 ? cat : a.name.localeCompare(b.name);
		});
		const lines = [`**${sorted.length} articolo/i in inventario**`, ""];
		let currentCat = "";
		for (const item of sorted) {
			if (item.category !== currentCat) {
				currentCat = item.category;
				lines.push(`### ${currentCat}`);
			}
			lines.push(`- ${itemToLine(item)}`);
		}
		return { output: lines.join("\n") };
	}
	search(args, root) {
		const q = (args.name ?? "").trim().toLowerCase();
		if (!q) return {
			isError: true,
			output: "Specifica un termine di ricerca (campo \"name\")."
		};
		const items = loadItems(root).filter((i) => i.name.toLowerCase().includes(q) || (i.notes ?? "").toLowerCase().includes(q) || (i.supplier ?? "").toLowerCase().includes(q) || (i.lot ?? "").toLowerCase().includes(q));
		if (items.length === 0) return { output: `Nessun articolo trovato per "${q}".` };
		const lines = [`**${items.length} risultato/i per "${q}"**`, ""];
		for (const item of items) lines.push(`- ${itemToLine(item)}`);
		return { output: lines.join("\n") };
	}
	stats(root) {
		const items = loadItems(root);
		if (items.length === 0) return { output: "Inventario vuoto. Usa l'operazione \"add\" per aggiungere materie prime." };
		const totalValue = items.reduce((sum, i) => sum + (i.cost !== void 0 ? i.cost * i.quantity : 0), 0);
		const expiring = items.filter((i) => i.bestBefore && daysUntil(i.bestBefore) <= 30).sort((a, b) => a.bestBefore < b.bestBefore ? -1 : 1);
		const expired = items.filter((i) => i.bestBefore && daysUntil(i.bestBefore) < 0);
		items.filter((i) => i.quantity === 0);
		const outOfStock = items.filter((i) => i.quantity <= 0);
		const byCategory = {};
		for (const i of items) byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
		const lines = [
			`**Riepilogo inventario**`,
			"",
			`- Articoli totali: ${items.length}`,
			`- Valore stimato: €${totalValue.toFixed(2)}`,
			`- Esauriti (qty 0): ${outOfStock.length}`,
			"",
			"Per categoria:",
			...Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `  - ${cat}: ${n}`)
		];
		if (expired.length > 0) {
			lines.push("", `**Scaduti (${expired.length}):**`);
			for (const i of expired) lines.push(`  - ${i.name} — scaduto da ${-daysUntil(i.bestBefore)}g`);
		}
		if (expiring.length > 0) {
			lines.push("", `**In scadenza entro 30 giorni (${expiring.length}):**`);
			for (const i of expiring) lines.push(`  - ${i.name} — ${i.bestBefore}${expiryLabel(i)}`);
		}
		if (outOfStock.length > 0) {
			lines.push("", `**Da riacquistare (${outOfStock.length}):**`);
			for (const i of outOfStock) lines.push(`  - ${i.name} [${i.category}]`);
		}
		return { output: lines.join("\n") };
	}
};
function inferCategory(name) {
	const n = name.toLowerCase();
	if (/\b(hop|luppolo|luppoli)\b/.test(n) || /(citra|mosaic|simcoe|cascade|saaz|hallertau|chinook|centennial|amarillo|galaxy|magnum|fuggles|goldings|willamette|columbus|warrior|strata|el dorado|tettnang|hersbrucker|nelson|motueka|azacca|idaho|bru-1|talus|sabro|vic secret|enigma|phoenix|northdown|target|challenger|brewers gold|perle|spalt|tradition|liberty|crystal|mt hood|sterling|santiam|glacier|summit|bravo|zeus|apollo|equinox|jarrylo|cashmere|lemon drop|mandarina|huell melon|polaris|comet|cluster|nugget|willamette)\b/.test(n)) return "hop";
	if (/\b(yeast|lievito|lieviti|safale|safbrew|saflager|wlp|wyeast|omega|lallemand|fermentis|mangrove|kveik|us-05|s-04|w-34)\b/.test(n)) return "yeast";
	if (/\b(spice|spezia|spezie|corriandolo|buccia|arancia|vaniglia|cannella|noce moscata|zenzero|pepe|chiodi|cardamomo|anice|finocchio|lavanda|rosmarino|timo|salvia|hibiscus|ibisco|ciliegia|frutto|frutta)\b/.test(n)) return "spice";
	if (/\b(salt|sale|calcio|magnesio|sodio|cloruro|solfato|bicarbonato|gypsum|epsom|calcium|magnesium|acqua|water)\b/.test(n)) return "water_salt";
	if (/\b(sugar|zucchero|destrosio|saccarosio|miele|melassa|sciroppo|glucosio|fruttosio|lattosio|brown sugar|turbinado|demerara|belgian candi|candi)\b/.test(n)) return "sugar";
	if (/\b(adjunct|fiocchi|flaked|riso|mais|avena|orzo|grano|farro|segale|rye|wheat|oats|rice|corn|barley|triticale|sorgo|miglio|quinoa)\b/.test(n)) return "adjunct";
	return "malt";
}
function defaultUnit(category) {
	switch (category) {
		case "hop":
		case "spice":
		case "water_salt": return "g";
		case "yeast": return "pcs";
		case "sugar": return "kg";
		default: return "kg";
	}
}
registerTool(InventoryManagerTool);

//#endregion
//#region node_modules/js-yaml/dist/js-yaml.mjs
function getDefaultExportFromCjs(x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsYaml = {};
var loader = {};
var common = {};
var hasRequiredCommon;
function requireCommon() {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	function isNothing(subject) {
		return typeof subject === "undefined" || subject === null;
	}
	function isObject(subject) {
		return typeof subject === "object" && subject !== null;
	}
	function toArray(sequence) {
		if (Array.isArray(sequence)) return sequence;
		else if (isNothing(sequence)) return [];
		return [sequence];
	}
	function extend(target, source) {
		if (source) {
			const sourceKeys = Object.keys(source);
			for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
				const key = sourceKeys[index];
				target[key] = source[key];
			}
		}
		return target;
	}
	function repeat(string, count) {
		let result = "";
		for (let cycle = 0; cycle < count; cycle += 1) result += string;
		return result;
	}
	function isNegativeZero(number) {
		return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
	}
	common.isNothing = isNothing;
	common.isObject = isObject;
	common.toArray = toArray;
	common.repeat = repeat;
	common.isNegativeZero = isNegativeZero;
	common.extend = extend;
	return common;
}
var exception;
var hasRequiredException;
function requireException() {
	if (hasRequiredException) return exception;
	hasRequiredException = 1;
	function formatError(exception2, compact) {
		let where = "";
		const message = exception2.reason || "(unknown reason)";
		if (!exception2.mark) return message;
		if (exception2.mark.name) where += "in \"" + exception2.mark.name + "\" ";
		where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
		if (!compact && exception2.mark.snippet) where += "\n\n" + exception2.mark.snippet;
		return message + " " + where;
	}
	function YAMLException2(reason, mark) {
		Error.call(this);
		this.name = "YAMLException";
		this.reason = reason;
		this.mark = mark;
		this.message = formatError(this, false);
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
		else this.stack = (/* @__PURE__ */ new Error()).stack || "";
	}
	YAMLException2.prototype = Object.create(Error.prototype);
	YAMLException2.prototype.constructor = YAMLException2;
	YAMLException2.prototype.toString = function toString(compact) {
		return this.name + ": " + formatError(this, compact);
	};
	exception = YAMLException2;
	return exception;
}
var snippet;
var hasRequiredSnippet;
function requireSnippet() {
	if (hasRequiredSnippet) return snippet;
	hasRequiredSnippet = 1;
	const common2 = requireCommon();
	function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
		let head = "";
		let tail = "";
		const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
		if (position - lineStart > maxHalfLength) {
			head = " ... ";
			lineStart = position - maxHalfLength + head.length;
		}
		if (lineEnd - position > maxHalfLength) {
			tail = " ...";
			lineEnd = position + maxHalfLength - tail.length;
		}
		return {
			str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
			pos: position - lineStart + head.length
		};
	}
	function padStart(string, max) {
		return common2.repeat(" ", max - string.length) + string;
	}
	function makeSnippet(mark, options) {
		options = Object.create(options || null);
		if (!mark.buffer) return null;
		if (!options.maxLength) options.maxLength = 79;
		if (typeof options.indent !== "number") options.indent = 1;
		if (typeof options.linesBefore !== "number") options.linesBefore = 3;
		if (typeof options.linesAfter !== "number") options.linesAfter = 2;
		const re = /\r?\n|\r|\0/g;
		const lineStarts = [0];
		const lineEnds = [];
		let match;
		let foundLineNo = -1;
		while (match = re.exec(mark.buffer)) {
			lineEnds.push(match.index);
			lineStarts.push(match.index + match[0].length);
			if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
		}
		if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
		let result = "";
		const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
		const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
		for (let i = 1; i <= options.linesBefore; i++) {
			if (foundLineNo - i < 0) break;
			const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
			result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + "\n" + result;
		}
		const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
		result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
		result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
		for (let i = 1; i <= options.linesAfter; i++) {
			if (foundLineNo + i >= lineEnds.length) break;
			const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
			result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + "\n";
		}
		return result.replace(/\n$/, "");
	}
	snippet = makeSnippet;
	return snippet;
}
var type;
var hasRequiredType;
function requireType() {
	if (hasRequiredType) return type;
	hasRequiredType = 1;
	const YAMLException2 = requireException();
	const TYPE_CONSTRUCTOR_OPTIONS = [
		"kind",
		"multi",
		"resolve",
		"construct",
		"instanceOf",
		"predicate",
		"represent",
		"representName",
		"defaultStyle",
		"styleAliases"
	];
	const YAML_NODE_KINDS = [
		"scalar",
		"sequence",
		"mapping"
	];
	function compileStyleAliases(map2) {
		const result = {};
		if (map2 !== null) Object.keys(map2).forEach(function(style) {
			map2[style].forEach(function(alias) {
				result[String(alias)] = style;
			});
		});
		return result;
	}
	function Type2(tag, options) {
		options = options || {};
		Object.keys(options).forEach(function(name) {
			if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new YAMLException2("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
		});
		this.options = options;
		this.tag = tag;
		this.kind = options["kind"] || null;
		this.resolve = options["resolve"] || function() {
			return true;
		};
		this.construct = options["construct"] || function(data) {
			return data;
		};
		this.instanceOf = options["instanceOf"] || null;
		this.predicate = options["predicate"] || null;
		this.represent = options["represent"] || null;
		this.representName = options["representName"] || null;
		this.defaultStyle = options["defaultStyle"] || null;
		this.multi = options["multi"] || false;
		this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
		if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new YAMLException2("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
	}
	type = Type2;
	return type;
}
var schema;
var hasRequiredSchema;
function requireSchema() {
	if (hasRequiredSchema) return schema;
	hasRequiredSchema = 1;
	const YAMLException2 = requireException();
	const Type2 = requireType();
	function compileList(schema2, name) {
		const result = [];
		schema2[name].forEach(function(currentType) {
			let newIndex = result.length;
			result.forEach(function(previousType, previousIndex) {
				if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) newIndex = previousIndex;
			});
			result[newIndex] = currentType;
		});
		return result;
	}
	function compileMap() {
		const result = {
			scalar: {},
			sequence: {},
			mapping: {},
			fallback: {},
			multi: {
				scalar: [],
				sequence: [],
				mapping: [],
				fallback: []
			}
		};
		function collectType(type2) {
			if (type2.multi) {
				result.multi[type2.kind].push(type2);
				result.multi["fallback"].push(type2);
			} else result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
		}
		for (let index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
		return result;
	}
	function Schema2(definition) {
		return this.extend(definition);
	}
	Schema2.prototype.extend = function extend(definition) {
		let implicit = [];
		let explicit = [];
		if (definition instanceof Type2) explicit.push(definition);
		else if (Array.isArray(definition)) explicit = explicit.concat(definition);
		else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
			if (definition.implicit) implicit = implicit.concat(definition.implicit);
			if (definition.explicit) explicit = explicit.concat(definition.explicit);
		} else throw new YAMLException2("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
		implicit.forEach(function(type2) {
			if (!(type2 instanceof Type2)) throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
			if (type2.loadKind && type2.loadKind !== "scalar") throw new YAMLException2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
			if (type2.multi) throw new YAMLException2("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
		});
		explicit.forEach(function(type2) {
			if (!(type2 instanceof Type2)) throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		});
		const result = Object.create(Schema2.prototype);
		result.implicit = (this.implicit || []).concat(implicit);
		result.explicit = (this.explicit || []).concat(explicit);
		result.compiledImplicit = compileList(result, "implicit");
		result.compiledExplicit = compileList(result, "explicit");
		result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
		return result;
	};
	schema = Schema2;
	return schema;
}
var str;
var hasRequiredStr;
function requireStr() {
	if (hasRequiredStr) return str;
	hasRequiredStr = 1;
	str = new (requireType())("tag:yaml.org,2002:str", {
		kind: "scalar",
		construct: function(data) {
			return data !== null ? data : "";
		}
	});
	return str;
}
var seq;
var hasRequiredSeq;
function requireSeq() {
	if (hasRequiredSeq) return seq;
	hasRequiredSeq = 1;
	seq = new (requireType())("tag:yaml.org,2002:seq", {
		kind: "sequence",
		construct: function(data) {
			return data !== null ? data : [];
		}
	});
	return seq;
}
var map;
var hasRequiredMap;
function requireMap() {
	if (hasRequiredMap) return map;
	hasRequiredMap = 1;
	map = new (requireType())("tag:yaml.org,2002:map", {
		kind: "mapping",
		construct: function(data) {
			return data !== null ? data : {};
		}
	});
	return map;
}
var failsafe;
var hasRequiredFailsafe;
function requireFailsafe() {
	if (hasRequiredFailsafe) return failsafe;
	hasRequiredFailsafe = 1;
	failsafe = new (requireSchema())({ explicit: [
		requireStr(),
		requireSeq(),
		requireMap()
	] });
	return failsafe;
}
var _null;
var hasRequired_null;
function require_null() {
	if (hasRequired_null) return _null;
	hasRequired_null = 1;
	const Type2 = requireType();
	function resolveYamlNull(data) {
		if (data === null) return true;
		const max = data.length;
		return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
	}
	function constructYamlNull() {
		return null;
	}
	function isNull(object) {
		return object === null;
	}
	_null = new Type2("tag:yaml.org,2002:null", {
		kind: "scalar",
		resolve: resolveYamlNull,
		construct: constructYamlNull,
		predicate: isNull,
		represent: {
			canonical: function() {
				return "~";
			},
			lowercase: function() {
				return "null";
			},
			uppercase: function() {
				return "NULL";
			},
			camelcase: function() {
				return "Null";
			},
			empty: function() {
				return "";
			}
		},
		defaultStyle: "lowercase"
	});
	return _null;
}
var bool;
var hasRequiredBool;
function requireBool() {
	if (hasRequiredBool) return bool;
	hasRequiredBool = 1;
	const Type2 = requireType();
	function resolveYamlBoolean(data) {
		if (data === null) return false;
		const max = data.length;
		return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
	}
	function constructYamlBoolean(data) {
		return data === "true" || data === "True" || data === "TRUE";
	}
	function isBoolean(object) {
		return Object.prototype.toString.call(object) === "[object Boolean]";
	}
	bool = new Type2("tag:yaml.org,2002:bool", {
		kind: "scalar",
		resolve: resolveYamlBoolean,
		construct: constructYamlBoolean,
		predicate: isBoolean,
		represent: {
			lowercase: function(object) {
				return object ? "true" : "false";
			},
			uppercase: function(object) {
				return object ? "TRUE" : "FALSE";
			},
			camelcase: function(object) {
				return object ? "True" : "False";
			}
		},
		defaultStyle: "lowercase"
	});
	return bool;
}
var int;
var hasRequiredInt;
function requireInt() {
	if (hasRequiredInt) return int;
	hasRequiredInt = 1;
	const common2 = requireCommon();
	const Type2 = requireType();
	function isHexCode(c) {
		return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
	}
	function isOctCode(c) {
		return c >= 48 && c <= 55;
	}
	function isDecCode(c) {
		return c >= 48 && c <= 57;
	}
	function resolveYamlInteger(data) {
		if (data === null) return false;
		const max = data.length;
		let index = 0;
		let hasDigits = false;
		if (!max) return false;
		let ch = data[index];
		if (ch === "-" || ch === "+") ch = data[++index];
		if (ch === "0") {
			if (index + 1 === max) return true;
			ch = data[++index];
			if (ch === "b") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch !== "0" && ch !== "1") return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
			if (ch === "x") {
				index++;
				for (; index < max; index++) {
					if (!isHexCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
			if (ch === "o") {
				index++;
				for (; index < max; index++) {
					if (!isOctCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
		}
		for (; index < max; index++) {
			if (!isDecCode(data.charCodeAt(index))) return false;
			hasDigits = true;
		}
		if (!hasDigits) return false;
		return isFinite(parseYamlInteger(data));
	}
	function parseYamlInteger(data) {
		let value = data;
		let sign = 1;
		let ch = value[0];
		if (ch === "-" || ch === "+") {
			if (ch === "-") sign = -1;
			value = value.slice(1);
			ch = value[0];
		}
		if (value === "0") return 0;
		if (ch === "0") {
			if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
			if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
			if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
		}
		return sign * parseInt(value, 10);
	}
	function constructYamlInteger(data) {
		return parseYamlInteger(data);
	}
	function isInteger(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common2.isNegativeZero(object);
	}
	int = new Type2("tag:yaml.org,2002:int", {
		kind: "scalar",
		resolve: resolveYamlInteger,
		construct: constructYamlInteger,
		predicate: isInteger,
		represent: {
			binary: function(obj) {
				return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
			},
			octal: function(obj) {
				return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
			},
			decimal: function(obj) {
				return obj.toString(10);
			},
			hexadecimal: function(obj) {
				return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
			}
		},
		defaultStyle: "decimal",
		styleAliases: {
			binary: [2, "bin"],
			octal: [8, "oct"],
			decimal: [10, "dec"],
			hexadecimal: [16, "hex"]
		}
	});
	return int;
}
var float;
var hasRequiredFloat;
function requireFloat() {
	if (hasRequiredFloat) return float;
	hasRequiredFloat = 1;
	const common2 = requireCommon();
	const Type2 = requireType();
	const YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	const YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	function resolveYamlFloat(data) {
		if (data === null) return false;
		if (!YAML_FLOAT_PATTERN.test(data)) return false;
		if (isFinite(parseFloat(data, 10))) return true;
		return YAML_FLOAT_SPECIAL_PATTERN.test(data);
	}
	function constructYamlFloat(data) {
		let value = data.toLowerCase();
		const sign = value[0] === "-" ? -1 : 1;
		if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
		if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		else if (value === ".nan") return NaN;
		return sign * parseFloat(value, 10);
	}
	const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
	function representYamlFloat(object, style) {
		if (isNaN(object)) switch (style) {
			case "lowercase": return ".nan";
			case "uppercase": return ".NAN";
			case "camelcase": return ".NaN";
		}
		else if (Number.POSITIVE_INFINITY === object) switch (style) {
			case "lowercase": return ".inf";
			case "uppercase": return ".INF";
			case "camelcase": return ".Inf";
		}
		else if (Number.NEGATIVE_INFINITY === object) switch (style) {
			case "lowercase": return "-.inf";
			case "uppercase": return "-.INF";
			case "camelcase": return "-.Inf";
		}
		else if (common2.isNegativeZero(object)) return "-0.0";
		const res = object.toString(10);
		return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
	}
	function isFloat(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
	}
	float = new Type2("tag:yaml.org,2002:float", {
		kind: "scalar",
		resolve: resolveYamlFloat,
		construct: constructYamlFloat,
		predicate: isFloat,
		represent: representYamlFloat,
		defaultStyle: "lowercase"
	});
	return float;
}
var json;
var hasRequiredJson;
function requireJson() {
	if (hasRequiredJson) return json;
	hasRequiredJson = 1;
	json = requireFailsafe().extend({ implicit: [
		require_null(),
		requireBool(),
		requireInt(),
		requireFloat()
	] });
	return json;
}
var core;
var hasRequiredCore;
function requireCore() {
	if (hasRequiredCore) return core;
	hasRequiredCore = 1;
	core = requireJson();
	return core;
}
var timestamp;
var hasRequiredTimestamp;
function requireTimestamp() {
	if (hasRequiredTimestamp) return timestamp;
	hasRequiredTimestamp = 1;
	const Type2 = requireType();
	const YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
	const YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
	function resolveYamlTimestamp(data) {
		if (data === null) return false;
		if (YAML_DATE_REGEXP.exec(data) !== null) return true;
		if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
		return false;
	}
	function constructYamlTimestamp(data) {
		let fraction = 0;
		let delta = null;
		let match = YAML_DATE_REGEXP.exec(data);
		if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
		if (match === null) throw new Error("Date resolve error");
		const year = +match[1];
		const month = +match[2] - 1;
		const day = +match[3];
		if (!match[4]) return new Date(Date.UTC(year, month, day));
		const hour = +match[4];
		const minute = +match[5];
		const second = +match[6];
		if (match[7]) {
			fraction = match[7].slice(0, 3);
			while (fraction.length < 3) fraction += "0";
			fraction = +fraction;
		}
		if (match[9]) {
			const tzHour = +match[10];
			const tzMinute = +(match[11] || 0);
			delta = (tzHour * 60 + tzMinute) * 6e4;
			if (match[9] === "-") delta = -delta;
		}
		const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
		if (delta) date.setTime(date.getTime() - delta);
		return date;
	}
	function representYamlTimestamp(object) {
		return object.toISOString();
	}
	timestamp = new Type2("tag:yaml.org,2002:timestamp", {
		kind: "scalar",
		resolve: resolveYamlTimestamp,
		construct: constructYamlTimestamp,
		instanceOf: Date,
		represent: representYamlTimestamp
	});
	return timestamp;
}
var merge;
var hasRequiredMerge;
function requireMerge() {
	if (hasRequiredMerge) return merge;
	hasRequiredMerge = 1;
	const Type2 = requireType();
	function resolveYamlMerge(data) {
		return data === "<<" || data === null;
	}
	merge = new Type2("tag:yaml.org,2002:merge", {
		kind: "scalar",
		resolve: resolveYamlMerge
	});
	return merge;
}
var binary;
var hasRequiredBinary;
function requireBinary() {
	if (hasRequiredBinary) return binary;
	hasRequiredBinary = 1;
	const Type2 = requireType();
	const BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
	function resolveYamlBinary(data) {
		if (data === null) return false;
		let bitlen = 0;
		const max = data.length;
		const map2 = BASE64_MAP;
		for (let idx = 0; idx < max; idx++) {
			const code = map2.indexOf(data.charAt(idx));
			if (code > 64) continue;
			if (code < 0) return false;
			bitlen += 6;
		}
		return bitlen % 8 === 0;
	}
	function constructYamlBinary(data) {
		const input = data.replace(/[\r\n=]/g, "");
		const max = input.length;
		const map2 = BASE64_MAP;
		let bits = 0;
		const result = [];
		for (let idx = 0; idx < max; idx++) {
			if (idx % 4 === 0 && idx) {
				result.push(bits >> 16 & 255);
				result.push(bits >> 8 & 255);
				result.push(bits & 255);
			}
			bits = bits << 6 | map2.indexOf(input.charAt(idx));
		}
		const tailbits = max % 4 * 6;
		if (tailbits === 0) {
			result.push(bits >> 16 & 255);
			result.push(bits >> 8 & 255);
			result.push(bits & 255);
		} else if (tailbits === 18) {
			result.push(bits >> 10 & 255);
			result.push(bits >> 2 & 255);
		} else if (tailbits === 12) result.push(bits >> 4 & 255);
		return new Uint8Array(result);
	}
	function representYamlBinary(object) {
		let result = "";
		let bits = 0;
		const max = object.length;
		const map2 = BASE64_MAP;
		for (let idx = 0; idx < max; idx++) {
			if (idx % 3 === 0 && idx) {
				result += map2[bits >> 18 & 63];
				result += map2[bits >> 12 & 63];
				result += map2[bits >> 6 & 63];
				result += map2[bits & 63];
			}
			bits = (bits << 8) + object[idx];
		}
		const tail = max % 3;
		if (tail === 0) {
			result += map2[bits >> 18 & 63];
			result += map2[bits >> 12 & 63];
			result += map2[bits >> 6 & 63];
			result += map2[bits & 63];
		} else if (tail === 2) {
			result += map2[bits >> 10 & 63];
			result += map2[bits >> 4 & 63];
			result += map2[bits << 2 & 63];
			result += map2[64];
		} else if (tail === 1) {
			result += map2[bits >> 2 & 63];
			result += map2[bits << 4 & 63];
			result += map2[64];
			result += map2[64];
		}
		return result;
	}
	function isBinary(obj) {
		return Object.prototype.toString.call(obj) === "[object Uint8Array]";
	}
	binary = new Type2("tag:yaml.org,2002:binary", {
		kind: "scalar",
		resolve: resolveYamlBinary,
		construct: constructYamlBinary,
		predicate: isBinary,
		represent: representYamlBinary
	});
	return binary;
}
var omap;
var hasRequiredOmap;
function requireOmap() {
	if (hasRequiredOmap) return omap;
	hasRequiredOmap = 1;
	const Type2 = requireType();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const _toString = Object.prototype.toString;
	function resolveYamlOmap(data) {
		if (data === null) return true;
		const objectKeys = {};
		const object = data;
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			let pairHasKey = false;
			if (_toString.call(pair) !== "[object Object]") return false;
			let pairKey;
			for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) {
				if (!pairHasKey) pairHasKey = true;
				else return false;
			}
			if (!pairHasKey) return false;
			if (_hasOwnProperty.call(objectKeys, pairKey)) return false;
			Object.defineProperty(objectKeys, pairKey, { value: true });
		}
		return true;
	}
	function constructYamlOmap(data) {
		return data !== null ? data : [];
	}
	omap = new Type2("tag:yaml.org,2002:omap", {
		kind: "sequence",
		resolve: resolveYamlOmap,
		construct: constructYamlOmap
	});
	return omap;
}
var pairs;
var hasRequiredPairs;
function requirePairs() {
	if (hasRequiredPairs) return pairs;
	hasRequiredPairs = 1;
	const Type2 = requireType();
	const _toString = Object.prototype.toString;
	function resolveYamlPairs(data) {
		if (data === null) return true;
		const object = data;
		const result = new Array(object.length);
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			if (_toString.call(pair) !== "[object Object]") return false;
			const keys = Object.keys(pair);
			if (keys.length !== 1) return false;
			result[index] = [keys[0], pair[keys[0]]];
		}
		return true;
	}
	function constructYamlPairs(data) {
		if (data === null) return [];
		const object = data;
		const result = new Array(object.length);
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			const keys = Object.keys(pair);
			result[index] = [keys[0], pair[keys[0]]];
		}
		return result;
	}
	pairs = new Type2("tag:yaml.org,2002:pairs", {
		kind: "sequence",
		resolve: resolveYamlPairs,
		construct: constructYamlPairs
	});
	return pairs;
}
var set;
var hasRequiredSet;
function requireSet() {
	if (hasRequiredSet) return set;
	hasRequiredSet = 1;
	const Type2 = requireType();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	function resolveYamlSet(data) {
		if (data === null) return true;
		const object = data;
		for (const key in object) if (_hasOwnProperty.call(object, key)) {
			if (object[key] !== null) return false;
		}
		return true;
	}
	function constructYamlSet(data) {
		return data !== null ? data : {};
	}
	set = new Type2("tag:yaml.org,2002:set", {
		kind: "mapping",
		resolve: resolveYamlSet,
		construct: constructYamlSet
	});
	return set;
}
var _default;
var hasRequired_default;
function require_default() {
	if (hasRequired_default) return _default;
	hasRequired_default = 1;
	_default = requireCore().extend({
		implicit: [requireTimestamp(), requireMerge()],
		explicit: [
			requireBinary(),
			requireOmap(),
			requirePairs(),
			requireSet()
		]
	});
	return _default;
}
var hasRequiredLoader;
function requireLoader() {
	if (hasRequiredLoader) return loader;
	hasRequiredLoader = 1;
	const common2 = requireCommon();
	const YAMLException2 = requireException();
	const makeSnippet = requireSnippet();
	const DEFAULT_SCHEMA2 = require_default();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const CONTEXT_FLOW_IN = 1;
	const CONTEXT_FLOW_OUT = 2;
	const CONTEXT_BLOCK_IN = 3;
	const CONTEXT_BLOCK_OUT = 4;
	const CHOMPING_CLIP = 1;
	const CHOMPING_STRIP = 2;
	const CHOMPING_KEEP = 3;
	const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
	const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
	const PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
	const PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
	const PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
	function _class(obj) {
		return Object.prototype.toString.call(obj);
	}
	function isEol(c) {
		return c === 10 || c === 13;
	}
	function isWhiteSpace(c) {
		return c === 9 || c === 32;
	}
	function isWsOrEol(c) {
		return c === 9 || c === 32 || c === 10 || c === 13;
	}
	function isFlowIndicator(c) {
		return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
	}
	function fromHexCode(c) {
		if (c >= 48 && c <= 57) return c - 48;
		const lc = c | 32;
		if (lc >= 97 && lc <= 102) return lc - 97 + 10;
		return -1;
	}
	function escapedHexLen(c) {
		if (c === 120) return 2;
		if (c === 117) return 4;
		if (c === 85) return 8;
		return 0;
	}
	function fromDecimalCode(c) {
		if (c >= 48 && c <= 57) return c - 48;
		return -1;
	}
	function simpleEscapeSequence(c) {
		switch (c) {
			case 48: return "\0";
			case 97: return "\x07";
			case 98: return "\b";
			case 116: return "	";
			case 9: return "	";
			case 110: return "\n";
			case 118: return "\v";
			case 102: return "\f";
			case 114: return "\r";
			case 101: return "\x1B";
			case 32: return " ";
			case 34: return "\"";
			case 47: return "/";
			case 92: return "\\";
			case 78: return "";
			case 95: return "\xA0";
			case 76: return "\u2028";
			case 80: return "\u2029";
			default: return "";
		}
	}
	function charFromCodepoint(c) {
		if (c <= 65535) return String.fromCharCode(c);
		return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
	}
	function setProperty(object, key, value) {
		if (key === "__proto__") Object.defineProperty(object, key, {
			configurable: true,
			enumerable: true,
			writable: true,
			value
		});
		else object[key] = value;
	}
	const simpleEscapeCheck = new Array(256);
	const simpleEscapeMap = new Array(256);
	for (let i = 0; i < 256; i++) {
		simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
		simpleEscapeMap[i] = simpleEscapeSequence(i);
	}
	function State(input, options) {
		this.input = input;
		this.filename = options["filename"] || null;
		this.schema = options["schema"] || DEFAULT_SCHEMA2;
		this.onWarning = options["onWarning"] || null;
		this.legacy = options["legacy"] || false;
		this.json = options["json"] || false;
		this.listener = options["listener"] || null;
		this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
		this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
		this.implicitTypes = this.schema.compiledImplicit;
		this.typeMap = this.schema.compiledTypeMap;
		this.length = input.length;
		this.position = 0;
		this.line = 0;
		this.lineStart = 0;
		this.lineIndent = 0;
		this.depth = 0;
		this.totalMergeKeys = 0;
		this.firstTabInLine = -1;
		this.documents = [];
		this.anchorMapTransactions = [];
	}
	function generateError(state, message) {
		const mark = {
			name: state.filename,
			buffer: state.input.slice(0, -1),
			position: state.position,
			line: state.line,
			column: state.position - state.lineStart
		};
		mark.snippet = makeSnippet(mark);
		return new YAMLException2(message, mark);
	}
	function throwError(state, message) {
		throw generateError(state, message);
	}
	function throwWarning(state, message) {
		if (state.onWarning) state.onWarning.call(null, generateError(state, message));
	}
	function storeAnchor(state, name, value) {
		const transactions = state.anchorMapTransactions;
		if (transactions.length !== 0) {
			const transaction = transactions[transactions.length - 1];
			if (!_hasOwnProperty.call(transaction, name)) transaction[name] = {
				existed: _hasOwnProperty.call(state.anchorMap, name),
				value: state.anchorMap[name]
			};
		}
		state.anchorMap[name] = value;
	}
	function beginAnchorTransaction(state) {
		state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
	}
	function commitAnchorTransaction(state) {
		const transaction = state.anchorMapTransactions.pop();
		const transactions = state.anchorMapTransactions;
		if (transactions.length === 0) return;
		const parent = transactions[transactions.length - 1];
		const names = Object.keys(transaction);
		for (let index = 0, length = names.length; index < length; index += 1) {
			const name = names[index];
			if (!_hasOwnProperty.call(parent, name)) parent[name] = transaction[name];
		}
	}
	function rollbackAnchorTransaction(state) {
		const transaction = state.anchorMapTransactions.pop();
		const names = Object.keys(transaction);
		for (let index = names.length - 1; index >= 0; index -= 1) {
			const entry = transaction[names[index]];
			if (entry.existed) state.anchorMap[names[index]] = entry.value;
			else delete state.anchorMap[names[index]];
		}
	}
	function snapshotState(state) {
		return {
			position: state.position,
			line: state.line,
			lineStart: state.lineStart,
			lineIndent: state.lineIndent,
			firstTabInLine: state.firstTabInLine,
			tag: state.tag,
			anchor: state.anchor,
			kind: state.kind,
			result: state.result
		};
	}
	function restoreState(state, snapshot) {
		state.position = snapshot.position;
		state.line = snapshot.line;
		state.lineStart = snapshot.lineStart;
		state.lineIndent = snapshot.lineIndent;
		state.firstTabInLine = snapshot.firstTabInLine;
		state.tag = snapshot.tag;
		state.anchor = snapshot.anchor;
		state.kind = snapshot.kind;
		state.result = snapshot.result;
	}
	const directiveHandlers = {
		YAML: function handleYamlDirective(state, name, args) {
			if (state.version !== null) throwError(state, "duplication of %YAML directive");
			if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
			const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
			if (match === null) throwError(state, "ill-formed argument of the YAML directive");
			const major = parseInt(match[1], 10);
			const minor = parseInt(match[2], 10);
			if (major !== 1) throwError(state, "unacceptable YAML version of the document");
			state.version = args[0];
			state.checkLineBreaks = minor < 2;
			if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
		},
		TAG: function handleTagDirective(state, name, args) {
			let prefix;
			if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
			const handle = args[0];
			prefix = args[1];
			if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
			if (_hasOwnProperty.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
			if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
			try {
				prefix = decodeURIComponent(prefix);
			} catch (err) {
				throwError(state, "tag prefix is malformed: " + prefix);
			}
			state.tagMap[handle] = prefix;
		}
	};
	function captureSegment(state, start, end, checkJson) {
		if (start < end) {
			const _result = state.input.slice(start, end);
			if (checkJson) for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
				const _character = _result.charCodeAt(_position);
				if (!(_character === 9 || _character >= 32 && _character <= 1114111)) throwError(state, "expected valid JSON character");
			}
			else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
			state.result += _result;
		}
	}
	function mergeMappings(state, destination, source, overridableKeys) {
		if (!common2.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
		const sourceKeys = Object.keys(source);
		for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
			const key = sourceKeys[index];
			if (state.maxTotalMergeKeys !== -1 && ++state.totalMergeKeys > state.maxTotalMergeKeys) throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
			if (!_hasOwnProperty.call(destination, key)) {
				setProperty(destination, key, source[key]);
				overridableKeys[key] = true;
			}
		}
	}
	function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
		if (Array.isArray(keyNode)) {
			keyNode = Array.prototype.slice.call(keyNode);
			for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
				if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
				if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
			}
		}
		if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
		keyNode = String(keyNode);
		if (_result === null) _result = {};
		if (keyTag === "tag:yaml.org,2002:merge") {
			if (Array.isArray(valueNode)) for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys);
			else mergeMappings(state, _result, valueNode, overridableKeys);
		} else {
			if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
				state.line = startLine || state.line;
				state.lineStart = startLineStart || state.lineStart;
				state.position = startPos || state.position;
				throwError(state, "duplicated mapping key");
			}
			setProperty(_result, keyNode, valueNode);
			delete overridableKeys[keyNode];
		}
		return _result;
	}
	function readLineBreak(state) {
		const ch = state.input.charCodeAt(state.position);
		if (ch === 10) state.position++;
		else if (ch === 13) {
			state.position++;
			if (state.input.charCodeAt(state.position) === 10) state.position++;
		} else throwError(state, "a line break is expected");
		state.line += 1;
		state.lineStart = state.position;
		state.firstTabInLine = -1;
	}
	function skipSeparationSpace(state, allowComments, checkIndent) {
		let lineBreaks = 0;
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			while (isWhiteSpace(ch)) {
				if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
				ch = state.input.charCodeAt(++state.position);
			}
			if (allowComments && ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 10 && ch !== 13 && ch !== 0);
			if (isEol(ch)) {
				readLineBreak(state);
				ch = state.input.charCodeAt(state.position);
				lineBreaks++;
				state.lineIndent = 0;
				while (ch === 32) {
					state.lineIndent++;
					ch = state.input.charCodeAt(++state.position);
				}
			} else break;
		}
		if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) throwWarning(state, "deficient indentation");
		return lineBreaks;
	}
	function testDocumentSeparator(state) {
		let _position = state.position;
		let ch = state.input.charCodeAt(_position);
		if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
			_position += 3;
			ch = state.input.charCodeAt(_position);
			if (ch === 0 || isWsOrEol(ch)) return true;
		}
		return false;
	}
	function writeFoldedLines(state, count) {
		if (count === 1) state.result += " ";
		else if (count > 1) state.result += common2.repeat("\n", count - 1);
	}
	function readPlainScalar(state, nodeIndent, withinFlowCollection) {
		let captureStart;
		let captureEnd;
		let hasPendingContent;
		let _line;
		let _lineStart;
		let _lineIndent;
		const _kind = state.kind;
		const _result = state.result;
		let ch = state.input.charCodeAt(state.position);
		if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
		if (ch === 63 || ch === 45) {
			const following = state.input.charCodeAt(state.position + 1);
			if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) return false;
		}
		state.kind = "scalar";
		state.result = "";
		captureStart = captureEnd = state.position;
		hasPendingContent = false;
		while (ch !== 0) {
			if (ch === 58) {
				const following = state.input.charCodeAt(state.position + 1);
				if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) break;
			} else if (ch === 35) {
				if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
			} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) break;
			else if (isEol(ch)) {
				_line = state.line;
				_lineStart = state.lineStart;
				_lineIndent = state.lineIndent;
				skipSeparationSpace(state, false, -1);
				if (state.lineIndent >= nodeIndent) {
					hasPendingContent = true;
					ch = state.input.charCodeAt(state.position);
					continue;
				} else {
					state.position = captureEnd;
					state.line = _line;
					state.lineStart = _lineStart;
					state.lineIndent = _lineIndent;
					break;
				}
			}
			if (hasPendingContent) {
				captureSegment(state, captureStart, captureEnd, false);
				writeFoldedLines(state, state.line - _line);
				captureStart = captureEnd = state.position;
				hasPendingContent = false;
			}
			if (!isWhiteSpace(ch)) captureEnd = state.position + 1;
			ch = state.input.charCodeAt(++state.position);
		}
		captureSegment(state, captureStart, captureEnd, false);
		if (state.result) return true;
		state.kind = _kind;
		state.result = _result;
		return false;
	}
	function readSingleQuotedScalar(state, nodeIndent) {
		let captureStart;
		let captureEnd;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 39) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 39) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (ch === 39) {
				captureStart = state.position;
				state.position++;
				captureEnd = state.position;
			} else return true;
		} else if (isEol(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
		else {
			state.position++;
			if (!isWhiteSpace(ch)) captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a single quoted scalar");
	}
	function readDoubleQuotedScalar(state, nodeIndent) {
		let captureStart;
		let captureEnd;
		let tmp;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 34) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 34) {
			captureSegment(state, captureStart, state.position, true);
			state.position++;
			return true;
		} else if (ch === 92) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (isEol(ch)) skipSeparationSpace(state, false, nodeIndent);
			else if (ch < 256 && simpleEscapeCheck[ch]) {
				state.result += simpleEscapeMap[ch];
				state.position++;
			} else if ((tmp = escapedHexLen(ch)) > 0) {
				let hexLength = tmp;
				let hexResult = 0;
				for (; hexLength > 0; hexLength--) {
					ch = state.input.charCodeAt(++state.position);
					if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
					else throwError(state, "expected hexadecimal character");
				}
				state.result += charFromCodepoint(hexResult);
				state.position++;
			} else throwError(state, "unknown escape sequence");
			captureStart = captureEnd = state.position;
		} else if (isEol(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
		else {
			state.position++;
			if (!isWhiteSpace(ch)) captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a double quoted scalar");
	}
	function readFlowCollection(state, nodeIndent) {
		let readNext = true;
		let _line;
		let _lineStart;
		let _pos;
		const _tag = state.tag;
		let _result;
		const _anchor = state.anchor;
		let terminator;
		let isPair;
		let isExplicitPair;
		let isMapping;
		const overridableKeys = /* @__PURE__ */ Object.create(null);
		let keyNode;
		let keyTag;
		let valueNode;
		let ch = state.input.charCodeAt(state.position);
		if (ch === 91) {
			terminator = 93;
			isMapping = false;
			_result = [];
		} else if (ch === 123) {
			terminator = 125;
			isMapping = true;
			_result = {};
		} else return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		ch = state.input.charCodeAt(++state.position);
		while (ch !== 0) {
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === terminator) {
				state.position++;
				state.tag = _tag;
				state.anchor = _anchor;
				state.kind = isMapping ? "mapping" : "sequence";
				state.result = _result;
				return true;
			} else if (!readNext) throwError(state, "missed comma between flow collection entries");
			else if (ch === 44) throwError(state, "expected the node content, but found ','");
			keyTag = keyNode = valueNode = null;
			isPair = isExplicitPair = false;
			if (ch === 63) {
				if (isWsOrEol(state.input.charCodeAt(state.position + 1))) {
					isPair = isExplicitPair = true;
					state.position++;
					skipSeparationSpace(state, true, nodeIndent);
				}
			}
			_line = state.line;
			_lineStart = state.lineStart;
			_pos = state.position;
			composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
			keyTag = state.tag;
			keyNode = state.result;
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if ((isExplicitPair || state.line === _line) && ch === 58) {
				isPair = true;
				ch = state.input.charCodeAt(++state.position);
				skipSeparationSpace(state, true, nodeIndent);
				composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
				valueNode = state.result;
			}
			if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
			else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
			else _result.push(keyNode);
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === 44) {
				readNext = true;
				ch = state.input.charCodeAt(++state.position);
			} else readNext = false;
		}
		throwError(state, "unexpected end of the stream within a flow collection");
	}
	function readBlockScalar(state, nodeIndent) {
		let folding;
		let chomping = CHOMPING_CLIP;
		let didReadContent = false;
		let detectedIndent = false;
		let textIndent = nodeIndent;
		let emptyLines = 0;
		let atMoreIndented = false;
		let tmp;
		let ch = state.input.charCodeAt(state.position);
		if (ch === 124) folding = false;
		else if (ch === 62) folding = true;
		else return false;
		state.kind = "scalar";
		state.result = "";
		while (ch !== 0) {
			ch = state.input.charCodeAt(++state.position);
			if (ch === 43 || ch === 45) {
				if (CHOMPING_CLIP === chomping) chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
				else throwError(state, "repeat of a chomping mode identifier");
			} else if ((tmp = fromDecimalCode(ch)) >= 0) {
				if (tmp === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
				else if (!detectedIndent) {
					textIndent = nodeIndent + tmp - 1;
					detectedIndent = true;
				} else throwError(state, "repeat of an indentation width identifier");
			} else break;
		}
		if (isWhiteSpace(ch)) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (isWhiteSpace(ch));
			if (ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (!isEol(ch) && ch !== 0);
		}
		while (ch !== 0) {
			readLineBreak(state);
			state.lineIndent = 0;
			ch = state.input.charCodeAt(state.position);
			while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
				state.lineIndent++;
				ch = state.input.charCodeAt(++state.position);
			}
			if (!detectedIndent && state.lineIndent > textIndent) textIndent = state.lineIndent;
			if (isEol(ch)) {
				emptyLines++;
				continue;
			}
			if (!detectedIndent && textIndent === 0) throwError(state, "missing indentation for block scalar");
			if (state.lineIndent < textIndent) {
				if (chomping === CHOMPING_KEEP) state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
				else if (chomping === CHOMPING_CLIP) {
					if (didReadContent) state.result += "\n";
				}
				break;
			}
			if (folding) {
				if (isWhiteSpace(ch)) {
					atMoreIndented = true;
					state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
				} else if (atMoreIndented) {
					atMoreIndented = false;
					state.result += common2.repeat("\n", emptyLines + 1);
				} else if (emptyLines === 0) {
					if (didReadContent) state.result += " ";
				} else state.result += common2.repeat("\n", emptyLines);
			} else state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			didReadContent = true;
			detectedIndent = true;
			emptyLines = 0;
			const captureStart = state.position;
			while (!isEol(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
			captureSegment(state, captureStart, state.position, false);
		}
		return true;
	}
	function readBlockSequence(state, nodeIndent) {
		const _tag = state.tag;
		const _anchor = state.anchor;
		const _result = [];
		let detected = false;
		if (state.firstTabInLine !== -1) return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (state.firstTabInLine !== -1) {
				state.position = state.firstTabInLine;
				throwError(state, "tab characters must not be used in indentation");
			}
			if (ch !== 45) break;
			if (!isWsOrEol(state.input.charCodeAt(state.position + 1))) break;
			detected = true;
			state.position++;
			if (skipSeparationSpace(state, true, -1)) {
				if (state.lineIndent <= nodeIndent) {
					_result.push(null);
					ch = state.input.charCodeAt(state.position);
					continue;
				}
			}
			const _line = state.line;
			composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
			_result.push(state.result);
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a sequence entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "sequence";
			state.result = _result;
			return true;
		}
		return false;
	}
	function readBlockMapping(state, nodeIndent, flowIndent) {
		let allowCompact;
		let _keyLine;
		let _keyLineStart;
		let _keyPos;
		const _tag = state.tag;
		const _anchor = state.anchor;
		const _result = {};
		const overridableKeys = /* @__PURE__ */ Object.create(null);
		let keyTag = null;
		let keyNode = null;
		let valueNode = null;
		let atExplicitKey = false;
		let detected = false;
		if (state.firstTabInLine !== -1) return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (!atExplicitKey && state.firstTabInLine !== -1) {
				state.position = state.firstTabInLine;
				throwError(state, "tab characters must not be used in indentation");
			}
			const following = state.input.charCodeAt(state.position + 1);
			const _line = state.line;
			if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
				if (ch === 63) {
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
						keyTag = keyNode = valueNode = null;
					}
					detected = true;
					atExplicitKey = true;
					allowCompact = true;
				} else if (atExplicitKey) {
					atExplicitKey = false;
					allowCompact = true;
				} else throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
				state.position += 1;
				ch = following;
			} else {
				_keyLine = state.line;
				_keyLineStart = state.lineStart;
				_keyPos = state.position;
				if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
				if (state.line === _line) {
					ch = state.input.charCodeAt(state.position);
					while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
					if (ch === 58) {
						ch = state.input.charCodeAt(++state.position);
						if (!isWsOrEol(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
						if (atExplicitKey) {
							storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
							keyTag = keyNode = valueNode = null;
						}
						detected = true;
						atExplicitKey = false;
						allowCompact = false;
						keyTag = state.tag;
						keyNode = state.result;
					} else if (detected) throwError(state, "can not read an implicit mapping pair; a colon is missed");
					else {
						state.tag = _tag;
						state.anchor = _anchor;
						return true;
					}
				} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
				else {
					state.tag = _tag;
					state.anchor = _anchor;
					return true;
				}
			}
			if (state.line === _line || state.lineIndent > nodeIndent) {
				if (atExplicitKey) {
					_keyLine = state.line;
					_keyLineStart = state.lineStart;
					_keyPos = state.position;
				}
				if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
					if (atExplicitKey) keyNode = state.result;
					else valueNode = state.result;
				}
				if (!atExplicitKey) {
					storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
					keyTag = keyNode = valueNode = null;
				}
				skipSeparationSpace(state, true, -1);
				ch = state.input.charCodeAt(state.position);
			}
			if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "mapping";
			state.result = _result;
		}
		return detected;
	}
	function readTagProperty(state) {
		let isVerbatim = false;
		let isNamed = false;
		let tagHandle;
		let tagName;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 33) return false;
		if (state.tag !== null) throwError(state, "duplication of a tag property");
		ch = state.input.charCodeAt(++state.position);
		if (ch === 60) {
			isVerbatim = true;
			ch = state.input.charCodeAt(++state.position);
		} else if (ch === 33) {
			isNamed = true;
			tagHandle = "!!";
			ch = state.input.charCodeAt(++state.position);
		} else tagHandle = "!";
		let _position = state.position;
		if (isVerbatim) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 0 && ch !== 62);
			if (state.position < state.length) {
				tagName = state.input.slice(_position, state.position);
				ch = state.input.charCodeAt(++state.position);
			} else throwError(state, "unexpected end of the stream within a verbatim tag");
		} else {
			while (ch !== 0 && !isWsOrEol(ch)) {
				if (ch === 33) {
					if (!isNamed) {
						tagHandle = state.input.slice(_position - 1, state.position + 1);
						if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
						isNamed = true;
						_position = state.position + 1;
					} else throwError(state, "tag suffix cannot contain exclamation marks");
				}
				ch = state.input.charCodeAt(++state.position);
			}
			tagName = state.input.slice(_position, state.position);
			if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
		}
		if (tagName && !PATTERN_TAG_URI.test(tagName)) throwError(state, "tag name cannot contain such characters: " + tagName);
		try {
			tagName = decodeURIComponent(tagName);
		} catch (err) {
			throwError(state, "tag name is malformed: " + tagName);
		}
		if (isVerbatim) state.tag = tagName;
		else if (_hasOwnProperty.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
		else if (tagHandle === "!") state.tag = "!" + tagName;
		else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
		else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
		return true;
	}
	function readAnchorProperty(state) {
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 38) return false;
		if (state.anchor !== null) throwError(state, "duplication of an anchor property");
		ch = state.input.charCodeAt(++state.position);
		const _position = state.position;
		while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
		state.anchor = state.input.slice(_position, state.position);
		return true;
	}
	function readAlias(state) {
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 42) return false;
		ch = state.input.charCodeAt(++state.position);
		const _position = state.position;
		while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
		const alias = state.input.slice(_position, state.position);
		if (!_hasOwnProperty.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
		state.result = state.anchorMap[alias];
		skipSeparationSpace(state, true, -1);
		return true;
	}
	function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
		const fallbackState = snapshotState(state);
		beginAnchorTransaction(state);
		restoreState(state, propertyStart);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
			commitAnchorTransaction(state);
			return true;
		}
		rollbackAnchorTransaction(state);
		restoreState(state, fallbackState);
		return false;
	}
	function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
		let allowBlockScalars;
		let allowBlockCollections;
		let indentStatus = 1;
		let atNewLine = false;
		let hasContent = false;
		let propertyStart = null;
		let type2;
		let flowIndent;
		let blockIndent;
		if (state.depth >= state.maxDepth) throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
		state.depth += 1;
		if (state.listener !== null) state.listener("open", state);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
		if (allowToSeek) {
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			}
		}
		if (indentStatus === 1) while (true) {
			const ch = state.input.charCodeAt(state.position);
			const propertyState = snapshotState(state);
			if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) break;
			if (!readTagProperty(state) && !readAnchorProperty(state)) break;
			if (propertyStart === null) propertyStart = propertyState;
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				allowBlockCollections = allowBlockStyles;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			} else allowBlockCollections = false;
		}
		if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
		if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
			if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
			else flowIndent = parentIndent + 1;
			blockIndent = state.position - state.lineStart;
			if (indentStatus === 1) {
				if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
				else {
					const ch = state.input.charCodeAt(state.position);
					if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(state, propertyStart, propertyStart.position - propertyStart.lineStart, flowIndent)) hasContent = true;
					else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
					else if (readAlias(state)) {
						hasContent = true;
						if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
					} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
						hasContent = true;
						if (state.tag === null) state.tag = "?";
					}
					if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
				}
			} else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
		}
		if (state.tag === null) {
			if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
		} else if (state.tag === "?") {
			if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
			for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
				type2 = state.implicitTypes[typeIndex];
				if (type2.resolve(state.result)) {
					state.result = type2.construct(state.result);
					state.tag = type2.tag;
					if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
					break;
				}
			}
		} else if (state.tag !== "!") {
			if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) type2 = state.typeMap[state.kind || "fallback"][state.tag];
			else {
				type2 = null;
				const typeList = state.typeMap.multi[state.kind || "fallback"];
				for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
					type2 = typeList[typeIndex];
					break;
				}
			}
			if (!type2) throwError(state, "unknown tag !<" + state.tag + ">");
			if (state.result !== null && type2.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type2.kind + "\", not \"" + state.kind + "\"");
			if (!type2.resolve(state.result, state.tag)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
			else {
				state.result = type2.construct(state.result, state.tag);
				if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
			}
		}
		if (state.listener !== null) state.listener("close", state);
		state.depth -= 1;
		return state.tag !== null || state.anchor !== null || hasContent;
	}
	function readDocument(state) {
		const documentStart = state.position;
		let hasDirectives = false;
		let ch;
		state.version = null;
		state.checkLineBreaks = state.legacy;
		state.tagMap = /* @__PURE__ */ Object.create(null);
		state.anchorMap = /* @__PURE__ */ Object.create(null);
		while ((ch = state.input.charCodeAt(state.position)) !== 0) {
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if (state.lineIndent > 0 || ch !== 37) break;
			hasDirectives = true;
			ch = state.input.charCodeAt(++state.position);
			let _position = state.position;
			while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
			const directiveName = state.input.slice(_position, state.position);
			const directiveArgs = [];
			if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
			while (ch !== 0) {
				while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 35) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 0 && !isEol(ch));
					break;
				}
				if (isEol(ch)) break;
				_position = state.position;
				while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
				directiveArgs.push(state.input.slice(_position, state.position));
			}
			if (ch !== 0) readLineBreak(state);
			if (_hasOwnProperty.call(directiveHandlers, directiveName)) directiveHandlers[directiveName](state, directiveName, directiveArgs);
			else throwWarning(state, "unknown document directive \"" + directiveName + "\"");
		}
		skipSeparationSpace(state, true, -1);
		if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
			state.position += 3;
			skipSeparationSpace(state, true, -1);
		} else if (hasDirectives) throwError(state, "directives end mark is expected");
		composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
		skipSeparationSpace(state, true, -1);
		if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) throwWarning(state, "non-ASCII line breaks are interpreted as content");
		state.documents.push(state.result);
		if (state.position === state.lineStart && testDocumentSeparator(state)) {
			if (state.input.charCodeAt(state.position) === 46) {
				state.position += 3;
				skipSeparationSpace(state, true, -1);
			}
			return;
		}
		if (state.position < state.length - 1) throwError(state, "end of the stream or a document separator is expected");
	}
	function loadDocuments(input, options) {
		input = String(input);
		options = options || {};
		if (input.length !== 0) {
			if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
			if (input.charCodeAt(0) === 65279) input = input.slice(1);
		}
		const state = new State(input, options);
		const nullpos = input.indexOf("\0");
		if (nullpos !== -1) {
			state.position = nullpos;
			throwError(state, "null byte is not allowed in input");
		}
		state.input += "\0";
		while (state.input.charCodeAt(state.position) === 32) {
			state.lineIndent += 1;
			state.position += 1;
		}
		while (state.position < state.length - 1) readDocument(state);
		return state.documents;
	}
	function loadAll2(input, iterator, options) {
		if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		const documents = loadDocuments(input, options);
		if (typeof iterator !== "function") return documents;
		for (let index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
	}
	function load2(input, options) {
		const documents = loadDocuments(input, options);
		if (documents.length === 0) return;
		else if (documents.length === 1) return documents[0];
		throw new YAMLException2("expected a single document in the stream, but found more");
	}
	loader.loadAll = loadAll2;
	loader.load = load2;
	return loader;
}
var dumper = {};
var hasRequiredDumper;
function requireDumper() {
	if (hasRequiredDumper) return dumper;
	hasRequiredDumper = 1;
	const common2 = requireCommon();
	const YAMLException2 = requireException();
	const DEFAULT_SCHEMA2 = require_default();
	const _toString = Object.prototype.toString;
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const CHAR_BOM = 65279;
	const CHAR_TAB = 9;
	const CHAR_LINE_FEED = 10;
	const CHAR_CARRIAGE_RETURN = 13;
	const CHAR_SPACE = 32;
	const CHAR_EXCLAMATION = 33;
	const CHAR_DOUBLE_QUOTE = 34;
	const CHAR_SHARP = 35;
	const CHAR_PERCENT = 37;
	const CHAR_AMPERSAND = 38;
	const CHAR_SINGLE_QUOTE = 39;
	const CHAR_ASTERISK = 42;
	const CHAR_COMMA = 44;
	const CHAR_MINUS = 45;
	const CHAR_COLON = 58;
	const CHAR_EQUALS = 61;
	const CHAR_GREATER_THAN = 62;
	const CHAR_QUESTION = 63;
	const CHAR_COMMERCIAL_AT = 64;
	const CHAR_LEFT_SQUARE_BRACKET = 91;
	const CHAR_RIGHT_SQUARE_BRACKET = 93;
	const CHAR_GRAVE_ACCENT = 96;
	const CHAR_LEFT_CURLY_BRACKET = 123;
	const CHAR_VERTICAL_LINE = 124;
	const CHAR_RIGHT_CURLY_BRACKET = 125;
	const ESCAPE_SEQUENCES = {};
	ESCAPE_SEQUENCES[0] = "\\0";
	ESCAPE_SEQUENCES[7] = "\\a";
	ESCAPE_SEQUENCES[8] = "\\b";
	ESCAPE_SEQUENCES[9] = "\\t";
	ESCAPE_SEQUENCES[10] = "\\n";
	ESCAPE_SEQUENCES[11] = "\\v";
	ESCAPE_SEQUENCES[12] = "\\f";
	ESCAPE_SEQUENCES[13] = "\\r";
	ESCAPE_SEQUENCES[27] = "\\e";
	ESCAPE_SEQUENCES[34] = "\\\"";
	ESCAPE_SEQUENCES[92] = "\\\\";
	ESCAPE_SEQUENCES[133] = "\\N";
	ESCAPE_SEQUENCES[160] = "\\_";
	ESCAPE_SEQUENCES[8232] = "\\L";
	ESCAPE_SEQUENCES[8233] = "\\P";
	const DEPRECATED_BOOLEANS_SYNTAX = [
		"y",
		"Y",
		"yes",
		"Yes",
		"YES",
		"on",
		"On",
		"ON",
		"n",
		"N",
		"no",
		"No",
		"NO",
		"off",
		"Off",
		"OFF"
	];
	const DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
	function compileStyleMap(schema2, map2) {
		if (map2 === null) return {};
		const result = {};
		const keys = Object.keys(map2);
		for (let index = 0, length = keys.length; index < length; index += 1) {
			let tag = keys[index];
			let style = String(map2[tag]);
			if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
			const type2 = schema2.compiledTypeMap["fallback"][tag];
			if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) style = type2.styleAliases[style];
			result[tag] = style;
		}
		return result;
	}
	function encodeHex(character) {
		let handle;
		let length;
		const string = character.toString(16).toUpperCase();
		if (character <= 255) {
			handle = "x";
			length = 2;
		} else if (character <= 65535) {
			handle = "u";
			length = 4;
		} else if (character <= 4294967295) {
			handle = "U";
			length = 8;
		} else throw new YAMLException2("code point within a string may not be greater than 0xFFFFFFFF");
		return "\\" + handle + common2.repeat("0", length - string.length) + string;
	}
	const QUOTING_TYPE_SINGLE = 1;
	const QUOTING_TYPE_DOUBLE = 2;
	function State(options) {
		this.schema = options["schema"] || DEFAULT_SCHEMA2;
		this.indent = Math.max(1, options["indent"] || 2);
		this.noArrayIndent = options["noArrayIndent"] || false;
		this.skipInvalid = options["skipInvalid"] || false;
		this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
		this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
		this.sortKeys = options["sortKeys"] || false;
		this.lineWidth = options["lineWidth"] || 80;
		this.noRefs = options["noRefs"] || false;
		this.noCompatMode = options["noCompatMode"] || false;
		this.condenseFlow = options["condenseFlow"] || false;
		this.quotingType = options["quotingType"] === "\"" ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
		this.forceQuotes = options["forceQuotes"] || false;
		this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
		this.implicitTypes = this.schema.compiledImplicit;
		this.explicitTypes = this.schema.compiledExplicit;
		this.tag = null;
		this.result = "";
		this.duplicates = [];
		this.usedDuplicates = null;
	}
	function indentString(string, spaces) {
		const ind = common2.repeat(" ", spaces);
		let position = 0;
		let result = "";
		const length = string.length;
		while (position < length) {
			let line;
			const next = string.indexOf("\n", position);
			if (next === -1) {
				line = string.slice(position);
				position = length;
			} else {
				line = string.slice(position, next + 1);
				position = next + 1;
			}
			if (line.length && line !== "\n") result += ind;
			result += line;
		}
		return result;
	}
	function generateNextLine(state, level) {
		return "\n" + common2.repeat(" ", state.indent * level);
	}
	function testImplicitResolving(state, str2) {
		for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) if (state.implicitTypes[index].resolve(str2)) return true;
		return false;
	}
	function isWhitespace(c) {
		return c === CHAR_SPACE || c === CHAR_TAB;
	}
	function isPrintable(c) {
		return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
	}
	function isNsCharOrWhitespace(c) {
		return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
	}
	function isPlainSafe(c, prev, inblock) {
		const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
		const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
		return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
	}
	function isPlainSafeFirst(c) {
		return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
	}
	function isPlainSafeLast(c) {
		return !isWhitespace(c) && c !== CHAR_COLON;
	}
	function codePointAt(string, pos) {
		const first = string.charCodeAt(pos);
		let second;
		if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
			second = string.charCodeAt(pos + 1);
			if (second >= 56320 && second <= 57343) return (first - 55296) * 1024 + second - 56320 + 65536;
		}
		return first;
	}
	function needIndentIndicator(string) {
		return /^\n* /.test(string);
	}
	const STYLE_PLAIN = 1;
	const STYLE_SINGLE = 2;
	const STYLE_LITERAL = 3;
	const STYLE_FOLDED = 4;
	const STYLE_DOUBLE = 5;
	function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
		let i;
		let char = 0;
		let prevChar = null;
		let hasLineBreak = false;
		let hasFoldableLine = false;
		const shouldTrackWidth = lineWidth !== -1;
		let previousLineBreak = -1;
		let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
		if (singleLineOnly || forceQuotes) for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
			char = codePointAt(string, i);
			if (!isPrintable(char)) return STYLE_DOUBLE;
			plain = plain && isPlainSafe(char, prevChar, inblock);
			prevChar = char;
		}
		else {
			for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
				char = codePointAt(string, i);
				if (char === CHAR_LINE_FEED) {
					hasLineBreak = true;
					if (shouldTrackWidth) {
						hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
						previousLineBreak = i;
					}
				} else if (!isPrintable(char)) return STYLE_DOUBLE;
				plain = plain && isPlainSafe(char, prevChar, inblock);
				prevChar = char;
			}
			hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
		}
		if (!hasLineBreak && !hasFoldableLine) {
			if (plain && !forceQuotes && !testAmbiguousType(string)) return STYLE_PLAIN;
			return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
		}
		if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
		if (!forceQuotes) return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
		return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
	}
	function writeScalar(state, string, level, iskey, inblock) {
		state.dump = (function() {
			if (string.length === 0) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"\"" : "''";
			if (!state.noCompatMode) {
				if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"" + string + "\"" : "'" + string + "'";
			}
			const indent = state.indent * Math.max(1, level);
			const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
			const singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
			function testAmbiguity(string2) {
				return testImplicitResolving(state, string2);
			}
			switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
				case STYLE_PLAIN: return string;
				case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
				case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
				case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
				case STYLE_DOUBLE: return "\"" + escapeString(string) + "\"";
				default: throw new YAMLException2("impossible error: invalid scalar style");
			}
		})();
	}
	function blockHeader(string, indentPerLevel) {
		const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
		const clip = string[string.length - 1] === "\n";
		return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
	}
	function dropEndingNewline(string) {
		return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
	}
	function foldString(string, width) {
		const lineRe = /(\n+)([^\n]*)/g;
		let result = (function() {
			let nextLF = string.indexOf("\n");
			nextLF = nextLF !== -1 ? nextLF : string.length;
			lineRe.lastIndex = nextLF;
			return foldLine(string.slice(0, nextLF), width);
		})();
		let prevMoreIndented = string[0] === "\n" || string[0] === " ";
		let moreIndented;
		let match;
		while (match = lineRe.exec(string)) {
			const prefix = match[1];
			const line = match[2];
			moreIndented = line[0] === " ";
			result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
			prevMoreIndented = moreIndented;
		}
		return result;
	}
	function foldLine(line, width) {
		if (line === "" || line[0] === " ") return line;
		const breakRe = / [^ ]/g;
		let match;
		let start = 0;
		let end;
		let curr = 0;
		let next = 0;
		let result = "";
		while (match = breakRe.exec(line)) {
			next = match.index;
			if (next - start > width) {
				end = curr > start ? curr : next;
				result += "\n" + line.slice(start, end);
				start = end + 1;
			}
			curr = next;
		}
		result += "\n";
		if (line.length - start > width && curr > start) result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
		else result += line.slice(start);
		return result.slice(1);
	}
	function escapeString(string) {
		let result = "";
		let char = 0;
		for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
			char = codePointAt(string, i);
			const escapeSeq = ESCAPE_SEQUENCES[char];
			if (!escapeSeq && isPrintable(char)) {
				result += string[i];
				if (char >= 65536) result += string[i + 1];
			} else result += escapeSeq || encodeHex(char);
		}
		return result;
	}
	function writeFlowSequence(state, level, object) {
		let _result = "";
		const _tag = state.tag;
		for (let index = 0, length = object.length; index < length; index += 1) {
			let value = object[index];
			if (state.replacer) value = state.replacer.call(object, String(index), value);
			if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
				if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
				_result += state.dump;
			}
		}
		state.tag = _tag;
		state.dump = "[" + _result + "]";
	}
	function writeBlockSequence(state, level, object, compact) {
		let _result = "";
		const _tag = state.tag;
		for (let index = 0, length = object.length; index < length; index += 1) {
			let value = object[index];
			if (state.replacer) value = state.replacer.call(object, String(index), value);
			if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
				if (!compact || _result !== "") _result += generateNextLine(state, level);
				if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
				else _result += "- ";
				_result += state.dump;
			}
		}
		state.tag = _tag;
		state.dump = _result || "[]";
	}
	function writeFlowMapping(state, level, object) {
		let _result = "";
		const _tag = state.tag;
		const objectKeyList = Object.keys(object);
		for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
			let pairBuffer = "";
			if (_result !== "") pairBuffer += ", ";
			if (state.condenseFlow) pairBuffer += "\"";
			const objectKey = objectKeyList[index];
			let objectValue = object[objectKey];
			if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
			if (!writeNode(state, level, objectKey, false, false)) continue;
			if (state.dump.length > 1024) pairBuffer += "? ";
			pairBuffer += state.dump + (state.condenseFlow ? "\"" : "") + ":" + (state.condenseFlow ? "" : " ");
			if (!writeNode(state, level, objectValue, false, false)) continue;
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = "{" + _result + "}";
	}
	function writeBlockMapping(state, level, object, compact) {
		let _result = "";
		const _tag = state.tag;
		const objectKeyList = Object.keys(object);
		if (state.sortKeys === true) objectKeyList.sort();
		else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
		else if (state.sortKeys) throw new YAMLException2("sortKeys must be a boolean or a function");
		for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
			let pairBuffer = "";
			if (!compact || _result !== "") pairBuffer += generateNextLine(state, level);
			const objectKey = objectKeyList[index];
			let objectValue = object[objectKey];
			if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
			if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
			const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
			if (explicitPair) {
				if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += "?";
				else pairBuffer += "? ";
			}
			pairBuffer += state.dump;
			if (explicitPair) pairBuffer += generateNextLine(state, level);
			if (!writeNode(state, level + 1, objectValue, true, explicitPair)) continue;
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += ":";
			else pairBuffer += ": ";
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = _result || "{}";
	}
	function detectType(state, object, explicit) {
		const typeList = explicit ? state.explicitTypes : state.implicitTypes;
		for (let index = 0, length = typeList.length; index < length; index += 1) {
			const type2 = typeList[index];
			if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
				if (explicit) {
					if (type2.multi && type2.representName) state.tag = type2.representName(object);
					else state.tag = type2.tag;
				} else state.tag = "?";
				if (type2.represent) {
					const style = state.styleMap[type2.tag] || type2.defaultStyle;
					let _result;
					if (_toString.call(type2.represent) === "[object Function]") _result = type2.represent(object, style);
					else if (_hasOwnProperty.call(type2.represent, style)) _result = type2.represent[style](object, style);
					else throw new YAMLException2("!<" + type2.tag + "> tag resolver accepts not \"" + style + "\" style");
					state.dump = _result;
				}
				return true;
			}
		}
		return false;
	}
	function writeNode(state, level, object, block, compact, iskey, isblockseq) {
		state.tag = null;
		state.dump = object;
		if (!detectType(state, object, false)) detectType(state, object, true);
		const type2 = _toString.call(state.dump);
		const inblock = block;
		if (block) block = state.flowLevel < 0 || state.flowLevel > level;
		const objectOrArray = type2 === "[object Object]" || type2 === "[object Array]";
		let duplicateIndex;
		let duplicate;
		if (objectOrArray) {
			duplicateIndex = state.duplicates.indexOf(object);
			duplicate = duplicateIndex !== -1;
		}
		if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
		if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
		else {
			if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
			if (type2 === "[object Object]") {
				if (block && Object.keys(state.dump).length !== 0) {
					writeBlockMapping(state, level, state.dump, compact);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
				} else {
					writeFlowMapping(state, level, state.dump);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
				}
			} else if (type2 === "[object Array]") {
				if (block && state.dump.length !== 0) {
					if (state.noArrayIndent && !isblockseq && level > 0) writeBlockSequence(state, level - 1, state.dump, compact);
					else writeBlockSequence(state, level, state.dump, compact);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
				} else {
					writeFlowSequence(state, level, state.dump);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
				}
			} else if (type2 === "[object String]") {
				if (state.tag !== "?") writeScalar(state, state.dump, level, iskey, inblock);
			} else if (type2 === "[object Undefined]") return false;
			else {
				if (state.skipInvalid) return false;
				throw new YAMLException2("unacceptable kind of an object to dump " + type2);
			}
			if (state.tag !== null && state.tag !== "?") {
				let tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
				if (state.tag[0] === "!") tagStr = "!" + tagStr;
				else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") tagStr = "!!" + tagStr.slice(18);
				else tagStr = "!<" + tagStr + ">";
				state.dump = tagStr + " " + state.dump;
			}
		}
		return true;
	}
	function getDuplicateReferences(object, state) {
		const objects = [];
		const duplicatesIndexes = [];
		inspectNode(object, objects, duplicatesIndexes);
		const length = duplicatesIndexes.length;
		for (let index = 0; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
		state.usedDuplicates = new Array(length);
	}
	function inspectNode(object, objects, duplicatesIndexes) {
		if (object !== null && typeof object === "object") {
			const index = objects.indexOf(object);
			if (index !== -1) {
				if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
			} else {
				objects.push(object);
				if (Array.isArray(object)) for (let i = 0, length = object.length; i < length; i += 1) inspectNode(object[i], objects, duplicatesIndexes);
				else {
					const objectKeyList = Object.keys(object);
					for (let i = 0, length = objectKeyList.length; i < length; i += 1) inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
				}
			}
		}
	}
	function dump2(input, options) {
		options = options || {};
		const state = new State(options);
		if (!state.noRefs) getDuplicateReferences(input, state);
		let value = input;
		if (state.replacer) value = state.replacer.call({ "": value }, "", value);
		if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
		return "";
	}
	dumper.dump = dump2;
	return dumper;
}
var hasRequiredJsYaml;
function requireJsYaml() {
	if (hasRequiredJsYaml) return jsYaml;
	hasRequiredJsYaml = 1;
	const loader2 = requireLoader();
	const dumper2 = requireDumper();
	function renamed(from, to) {
		return function() {
			throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
		};
	}
	jsYaml.Type = requireType();
	jsYaml.Schema = requireSchema();
	jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
	jsYaml.JSON_SCHEMA = requireJson();
	jsYaml.CORE_SCHEMA = requireCore();
	jsYaml.DEFAULT_SCHEMA = require_default();
	jsYaml.load = loader2.load;
	jsYaml.loadAll = loader2.loadAll;
	jsYaml.dump = dumper2.dump;
	jsYaml.YAMLException = requireException();
	jsYaml.types = {
		binary: requireBinary(),
		float: requireFloat(),
		map: requireMap(),
		null: require_null(),
		pairs: requirePairs(),
		set: requireSet(),
		timestamp: requireTimestamp(),
		bool: requireBool(),
		int: requireInt(),
		merge: requireMerge(),
		omap: requireOmap(),
		seq: requireSeq(),
		str: requireStr()
	};
	jsYaml.safeLoad = renamed("safeLoad", "load");
	jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
	jsYaml.safeDump = renamed("safeDump", "dump");
	return jsYaml;
}
const yaml = /* @__PURE__ */ getDefaultExportFromCjs(requireJsYaml());
const { Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump } = yaml;

//#endregion
//#region src/brewing/yaml-to-docx.ts
/**
* YAML to DOCX converter — converts a beer recipe YAML file to a .docx document.
* Pure Node.js: uses js-yaml for parsing, generates Office Open XML (docx is a zip of XML).
*/
const YamlToDocxInputSchema = object({
	input_file: string().describe("Path to the recipe YAML file."),
	output_file: string().optional().describe("Path for the output .docx file. Defaults to input_file with .docx extension.")
});
function escapeXml(text) {
	return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
/**
* Render a YAML value as a list of lines with proper indentation, so nested
* objects and arrays of objects read like a JSON-serialized structure
* instead of a flat `[object Object]` blob.
*/
function valueLines(value, indent) {
	if (value == null) return ["-"];
	if (typeof value === "string") return [value];
	if (typeof value === "number" || typeof value === "boolean") return [String(value)];
	if (Array.isArray(value)) {
		if (value.length === 0) return ["-"];
		const lines = [];
		for (const item of value) if (typeof item === "object" && item !== null) {
			const entries = Object.entries(item);
			if (entries.length === 0) {
				lines.push("• -");
				continue;
			}
			const [firstKey, firstVal] = entries[0];
			const firstLines = valueLines(firstVal, indent + 1);
			lines.push(`• ${firstKey}: ${firstLines[0] ?? ""}`);
			for (let i = 1; i < firstLines.length; i++) lines.push(`  ${firstLines[i]}`);
			for (let i = 1; i < entries.length; i++) {
				const [k, v] = entries[i];
				const vLines = valueLines(v, indent + 1);
				lines.push(`  ${k}: ${vLines[0] ?? ""}`);
				for (let j = 1; j < vLines.length; j++) lines.push(`    ${vLines[j]}`);
			}
		} else lines.push(`• ${valueLines(item, indent + 1)[0] ?? ""}`);
		return lines;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0) return ["-"];
		const lines = [];
		for (const [k, v] of entries) {
			const vLines = valueLines(v, indent + 1);
			lines.push(`${k}: ${vLines[0] ?? ""}`);
			for (let i = 1; i < vLines.length; i++) lines.push(`  ${vLines[i]}`);
		}
		return lines;
	}
	return [String(value)];
}
function yamlToDocx(inputPath, outputPath) {
	const raw = readFileSync(inputPath, "utf-8");
	const data = load(raw) ?? {};
	let body = "";
	const nome = String(data["nome"] ?? "Ricetta di Birra");
	body += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${escapeXml(nome)}</w:t></w:r></w:p>`;
	if (data["stile"]) body += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(data["stile"]))}</w:t></w:r></w:p>`;
	if (data["descrizione"]) body += `<w:p><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(data["descrizione"]))}</w:t></w:r></w:p>`;
	function heading(text) {
		body += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C0392B"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="C0392B"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
	}
	function kv(label, value) {
		const lines = valueLines(value, 0);
		if (Array.isArray(value) || typeof value === "object" && value !== null) {
			body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}:</w:t></w:r></w:p>`;
			for (const line of lines) body += `<w:p><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
		} else body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}: </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(lines[0] ?? "-")}</w:t></w:r></w:p>`;
	}
	function simpleTable(header, rows) {
		body += "<w:tbl><w:tblPr><w:tblW w:w=\"9000\" w:type=\"dxa\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"C0392B\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"C0392B\"/></w:tblBorders></w:tblPr><w:tblGrid>";
		const colWidth = Math.floor(9e3 / header.length);
		for (let i = 0; i < header.length; i++) body += `<w:gridCol w:w="${colWidth}"/>`;
		body += "</w:tblGrid>";
		body += "<w:tr>";
		for (const h of header) body += `<w:tc><w:tcPr><w:shd w:fill="C0392B" w:val="clear"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r></w:p></w:tc>`;
		body += "</w:tr>";
		for (const row of rows) {
			body += "<w:tr>";
			for (let c = 0; c < header.length; c++) body += `<w:tc><w:p><w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escapeXml(row[c] ?? "-")}</w:t></w:r></w:p></w:tc>`;
			body += "</w:tr>";
		}
		body += "</w:tbl>";
	}
	const params = data["parametri"];
	if (params && Object.keys(params).length > 0) {
		heading("Parametri");
		for (const [k, v] of Object.entries(params)) kv(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v);
	}
	const grist = data["grist"];
	if (grist && grist.length > 0) {
		heading("Grist");
		simpleTable([
			"Malto",
			"Kg",
			"%",
			"Note"
		], grist.map((g) => [
			String(g["malto"] ?? ""),
			String(g["kg"] ?? ""),
			String(g["percent"] ?? ""),
			String(g["note"] ?? "")
		]));
	}
	const hops = data["luppolatura"];
	if (hops && hops.length > 0) {
		heading("Luppolatura");
		simpleTable([
			"Varietà",
			"g",
			"Tempo",
			"Uso",
			"AA%",
			"IBU",
			"Note"
		], hops.map((h) => [
			String(h["varieta"] ?? ""),
			String(h["grammi"] ?? ""),
			String(h["tempo_min"] ?? ""),
			String(h["uso"] ?? ""),
			String(h["aa_percent"] ?? ""),
			String(h["ibu_stimati"] ?? ""),
			String(h["note"] ?? "")
		]));
	}
	for (const sec of [
		"lievito",
		"acqua",
		"mash",
		"bollitura",
		"fermentazione",
		"carbonazione"
	]) {
		const obj = data[sec];
		if (obj && Object.keys(obj).length > 0) {
			heading(sec.charAt(0).toUpperCase() + sec.slice(1));
			for (const [k, v] of Object.entries(obj)) kv(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v);
		}
	}
	const handled = /* @__PURE__ */ new Set([
		"nome",
		"stile",
		"descrizione",
		"parametri",
		"grist",
		"luppolatura",
		"lievito",
		"acqua",
		"mash",
		"bollitura",
		"fermentazione",
		"carbonazione",
		"note_critiche",
		"alternative"
	]);
	for (const [key, value] of Object.entries(data)) {
		if (handled.has(key)) continue;
		if (value == null) continue;
		heading(key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
		if (Array.isArray(value)) for (const item of value) if (typeof item === "object" && item !== null) for (const line of valueLines(item, 0)) body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
		else body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(String(item))}</w:t></w:r></w:p>`;
		else if (typeof value === "object" && value !== null) for (const [k, v] of Object.entries(value)) kv(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v);
		else body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(value))}</w:t></w:r></w:p>`;
	}
	const notes = data["note_critiche"];
	if (notes) {
		heading("Note Critiche");
		const items = Array.isArray(notes) ? notes : String(notes).split("\n");
		for (const n of items) {
			const trimmed = String(n).trim();
			if (!trimmed) continue;
			body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(trimmed)}</w:t></w:r></w:p>`;
		}
	}
	const alts = data["alternative"];
	if (alts && alts.length > 0) {
		heading("Alternative");
		for (const a of alts) {
			body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(String(a["descrizione"] ?? ""))}</w:t></w:r></w:p>`;
			if (a["cambiamenti"]) body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">  Cambiamenti: ${escapeXml(String(a["cambiamenti"]))}</w:t></w:r></w:p>`;
			if (a["impatto"]) body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">  Impatto: ${escapeXml(String(a["impatto"]))}</w:t></w:r></w:p>`;
		}
	}
	body += `<w:p><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t xml:space="preserve">Generato da Maestra Birraia AI</w:t></w:r></w:p>`;
	const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}</w:body></w:document>`;
	const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
	const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
	function crc32(data) {
		let crc = 4294967295;
		for (let i = 0; i < data.length; i++) {
			crc ^= data[i];
			for (let j = 0; j < 8; j++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
		}
		return (crc ^ 4294967295) >>> 0;
	}
	function buildZip(entries) {
		const chunks = [];
		const localHeaders = [];
		let offset = 0;
		for (const entry of entries) {
			const nameBuf = Buffer.from(entry.name, "utf-8");
			const crc = crc32(entry.data);
			const header = Buffer.alloc(30 + nameBuf.length);
			let pos = 0;
			header.writeUInt32LE(67324752, pos);
			pos += 4;
			header.writeUInt16LE(20, pos);
			pos += 2;
			header.writeUInt16LE(2048, pos);
			pos += 2;
			header.writeUInt16LE(0, pos);
			pos += 2;
			header.writeUInt16LE(0, pos);
			pos += 2;
			header.writeUInt16LE(0, pos);
			pos += 2;
			header.writeUInt32LE(crc, pos);
			pos += 4;
			header.writeUInt32LE(entry.data.length, pos);
			pos += 4;
			header.writeUInt32LE(entry.data.length, pos);
			pos += 4;
			header.writeUInt16LE(nameBuf.length, pos);
			pos += 2;
			header.writeUInt16LE(0, pos);
			pos += 2;
			nameBuf.copy(header, pos);
			chunks.push(header);
			chunks.push(entry.data);
			localHeaders.push({
				offset,
				name: entry.name,
				crc,
				size: entry.data.length
			});
			offset += header.length + entry.data.length;
		}
		const cdChunks = [];
		let cdOffset = offset;
		for (const lh of localHeaders) {
			const nameBuf = Buffer.from(lh.name, "utf-8");
			const cd = Buffer.alloc(46 + nameBuf.length);
			let pos = 0;
			cd.writeUInt32LE(33639248, pos);
			pos += 4;
			cd.writeUInt16LE(20, pos);
			pos += 2;
			cd.writeUInt16LE(20, pos);
			pos += 2;
			cd.writeUInt16LE(2048, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt32LE(lh.crc, pos);
			pos += 4;
			cd.writeUInt32LE(lh.size, pos);
			pos += 4;
			cd.writeUInt32LE(lh.size, pos);
			pos += 4;
			cd.writeUInt16LE(nameBuf.length, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt16LE(0, pos);
			pos += 2;
			cd.writeUInt32LE(0, pos);
			pos += 4;
			cd.writeUInt32LE(lh.offset, pos);
			pos += 4;
			nameBuf.copy(cd, pos);
			cdChunks.push(cd);
			cdOffset += cd.length;
		}
		const eocd = Buffer.alloc(22);
		let pos = 0;
		eocd.writeUInt32LE(101010256, pos);
		pos += 4;
		eocd.writeUInt16LE(0, pos);
		pos += 2;
		eocd.writeUInt16LE(0, pos);
		pos += 2;
		eocd.writeUInt16LE(entries.length, pos);
		pos += 2;
		eocd.writeUInt16LE(entries.length, pos);
		pos += 2;
		eocd.writeUInt32LE(cdOffset - offset, pos);
		pos += 4;
		eocd.writeUInt32LE(offset, pos);
		pos += 4;
		eocd.writeUInt16LE(0, pos);
		return Buffer.concat([
			...chunks,
			...cdChunks,
			eocd
		]);
	}
	const zip = buildZip([
		{
			name: "[Content_Types].xml",
			data: Buffer.from(contentTypesXml, "utf-8")
		},
		{
			name: "_rels/.rels",
			data: Buffer.from(relsXml, "utf-8")
		},
		{
			name: "word/document.xml",
			data: Buffer.from(documentXml, "utf-8")
		}
	]);
	writeFileSync(outputPath, zip);
	return `DOCX saved: ${outputPath}`;
}
var YamlToDocxTool = class {
	name = "yaml_to_docx";
	description = "Convert a beer recipe YAML file to a .docx (Word) document. Pure Node.js — generates valid Office Open XML, no external dependencies beyond js-yaml.";
	parameters = toInputJsonSchema(YamlToDocxInputSchema);
	resolveExecution(args) {
		const inputFile = args.input_file;
		const outputFile = args.output_file ?? inputFile.replace(/\.ya?ml$/i, "") + ".docx";
		return {
			description: `Convert ${inputFile} → DOCX`,
			approvalRule: this.name,
			execute: () => {
				try {
					if (!existsSync(inputFile)) return Promise.resolve({
						isError: true,
						output: `File not found: ${inputFile}`
					});
					const result = yamlToDocx(inputFile, outputFile);
					return Promise.resolve({ output: result });
				} catch (error) {
					return Promise.resolve({
						isError: true,
						output: error instanceof Error ? error.message : String(error)
					});
				}
			}
		};
	}
};
registerTool(YamlToDocxTool);

//#endregion
//#region src/shim/pdf-lite.ts
/**
* Minimal, dependency-free PDF writer covering exactly the fluent API subset
* `yaml-to-pdf.ts` uses (originally written against `pdfkit`). Bundling
* pdfkit into a single-file MCP server is unreliable — it reads its standard
* font metrics (.afm files) from paths relative to its own package at
* runtime, which breaks once esbuild collapses everything into one file.
* This class re-implements just enough of the PDF format (objects, xref,
* standard-14 fonts, simple text/line/rect drawing) to render the same
* recipe layout without any external dependency.
*
* Known simplifications versus pdfkit: text width is estimated from an
* average glyph-width factor per font weight (not real AFM metrics), and
* only Latin-1 codepoints are supported in text (others become `?`).
*/
const FONT_RESOURCE_NAME = {
	Helvetica: "F1",
	"Helvetica-Bold": "F2",
	"Helvetica-Oblique": "F3"
};
const AVG_CHAR_WIDTH = {
	Helvetica: .5,
	"Helvetica-Bold": .56,
	"Helvetica-Oblique": .5
};
function hexToRgb(color) {
	let hex = color.trim();
	if (hex.startsWith("#")) hex = hex.slice(1);
	if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
	const n = parseInt(hex, 16);
	if (Number.isNaN(n)) return [
		0,
		0,
		0
	];
	return [
		(n >> 16 & 255) / 255,
		(n >> 8 & 255) / 255,
		(n & 255) / 255
	];
}
function toLatin1(str) {
	let out = "";
	for (const ch of str) {
		const code = ch.codePointAt(0) ?? 63;
		out += code <= 255 ? String.fromCharCode(code) : "?";
	}
	return out;
}
function escapePdfString(str) {
	return toLatin1(str).replace(/[\\()]/g, (m) => `\\${m}`);
}
var PDFLite = class {
	pageW;
	pageH;
	margin;
	pages = [];
	page;
	curFont = "Helvetica";
	curSize = 12;
	curFillColor = [
		0,
		0,
		0
	];
	curStrokeColor = [
		0,
		0,
		0
	];
	curLineWidth = 1;
	cursorY;
	pendingRect;
	pendingLine;
	lastMoveTo;
	/** Where a `continued: true` text call left off, in logical (top-down) coordinates. */
	continuedCursor;
	constructor(opts) {
		this.pageW = 595.28;
		this.pageH = 841.89;
		this.margin = opts.margins ?? {
			top: 50,
			bottom: 50,
			left: 50,
			right: 50
		};
		this.cursorY = this.margin.top;
		this.addPage();
	}
	get y() {
		return this.cursorY;
	}
	set y(value) {
		this.cursorY = value;
	}
	addPage() {
		this.page = { ops: [] };
		this.pages.push(this.page);
		this.cursorY = this.margin.top;
		return this;
	}
	font(name) {
		this.curFont = name;
		return this;
	}
	fontSize(size) {
		this.curSize = size;
		return this;
	}
	fillColor(color) {
		this.curFillColor = hexToRgb(color);
		return this;
	}
	strokeColor(color) {
		this.curStrokeColor = hexToRgb(color);
		return this;
	}
	lineWidth(width) {
		this.curLineWidth = width;
		return this;
	}
	moveDown(lines = 1) {
		this.cursorY += lines * this.lineHeight();
		return this;
	}
	moveTo(x, y) {
		this.lastMoveTo = {
			x,
			y
		};
		return this;
	}
	lineTo(x, y) {
		if (this.lastMoveTo) this.pendingLine = {
			x1: this.lastMoveTo.x,
			y1: this.lastMoveTo.y,
			x2: x,
			y2: y
		};
		this.lastMoveTo = {
			x,
			y
		};
		return this;
	}
	stroke() {
		if (!this.pendingLine) return this;
		const [r, g, b] = this.curStrokeColor;
		const { x1, y1, x2, y2 } = this.pendingLine;
		this.page.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${this.curLineWidth.toFixed(2)} w ${x1.toFixed(2)} ${this.pdfY(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.pdfY(y2).toFixed(2)} l S`);
		this.pendingLine = void 0;
		return this;
	}
	rect(x, y, w, h) {
		this.pendingRect = {
			x,
			y,
			w,
			h
		};
		return this;
	}
	fill(color) {
		if (!this.pendingRect) return this;
		const [r, g, b] = color ? hexToRgb(color) : this.curFillColor;
		const { x, y, w, h } = this.pendingRect;
		const pdfBottomY = this.pdfY(y + h);
		this.page.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${pdfBottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
		this.pendingRect = void 0;
		return this;
	}
	text(str, xOrOpts, y, opts) {
		let x;
		let actualY;
		let actualOpts;
		if (typeof xOrOpts === "object" && xOrOpts !== null) actualOpts = xOrOpts;
		else {
			x = xOrOpts;
			actualY = y;
			actualOpts = opts ?? {};
		}
		if (x === void 0) {
			const cursor = this.continuedCursor ?? {
				x: this.margin.left,
				y: this.cursorY
			};
			x = cursor.x;
			actualY = cursor.y;
		}
		actualY ??= this.cursorY;
		const lineHeight = this.curSize * 1.2 + (actualOpts.lineGap ?? 0);
		const usableWidth = actualOpts.width ?? this.pageW - this.margin.right - x;
		const lines = actualOpts.width || actualOpts.align === "center" ? this.wrapText(str, actualOpts.width ?? usableWidth) : [str];
		let lastLineWidth = 0;
		lines.forEach((line, index) => {
			const lineY = actualY + index * lineHeight;
			let lineX = x;
			const lineWidth = this.measureWidth(line);
			lastLineWidth = lineWidth;
			if (actualOpts.align === "center") {
				const box = actualOpts.width ?? this.pageW - this.margin.left - this.margin.right;
				lineX = (actualOpts.width ? x : this.margin.left) + Math.max(0, (box - lineWidth) / 2);
			}
			this.drawTextLine(line, lineX, lineY);
		});
		if (actualOpts.continued) this.continuedCursor = {
			x: x + lastLineWidth,
			y: actualY
		};
		else {
			this.continuedCursor = void 0;
			this.cursorY = actualY + lines.length * lineHeight;
		}
		return this;
	}
	save(outputPath) {
		writeFileSync(outputPath, this.render());
	}
	lineHeight() {
		return this.curSize * 1.2;
	}
	pdfY(logicalY) {
		return this.pageH - logicalY;
	}
	measureWidth(str) {
		return str.length * this.curSize * AVG_CHAR_WIDTH[this.curFont];
	}
	wrapText(str, maxWidth) {
		if (maxWidth <= 0) return [str];
		const words = str.split(/\s+/).filter(Boolean);
		if (words.length === 0) return [""];
		const lines = [];
		let current = "";
		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (this.measureWidth(candidate) > maxWidth && current) {
				lines.push(current);
				current = word;
			} else current = candidate;
		}
		if (current) lines.push(current);
		return lines;
	}
	drawTextLine(str, x, y) {
		if (!str) return;
		const [r, g, b] = this.curFillColor;
		const fontRes = FONT_RESOURCE_NAME[this.curFont];
		const pdfTextY = this.pdfY(y) - this.curSize;
		this.page.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg BT /${fontRes} ${this.curSize.toFixed(2)} Tf ${x.toFixed(2)} ${pdfTextY.toFixed(2)} Td (${escapePdfString(str)}) Tj ET`);
	}
	render() {
		const objects = [];
		const fontObjIds = {
			Helvetica: 3,
			"Helvetica-Bold": 4,
			"Helvetica-Oblique": 5
		};
		let nextId = 6;
		const pageIds = [];
		const contentIds = [];
		const pageObjects = [];
		for (const page of this.pages) {
			const pageId = nextId++;
			const contentId = nextId++;
			pageIds.push(pageId);
			contentIds.push(contentId);
			const content = page.ops.join("\n");
			pageObjects.push(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /MediaBox [0 0 ${this.pageW.toFixed(2)} ${this.pageH.toFixed(2)}] /Contents ${contentId} 0 R >>\nendobj`);
			pageObjects.push(`${contentId} 0 obj\n<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream\nendobj`);
		}
		objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
		objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj`);
		for (const [name, id] of Object.entries(fontObjIds)) objects.push(`${id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>\nendobj`);
		objects.push(...pageObjects);
		const header = "%PDF-1.4\n";
		let body = "";
		const offsets = [0];
		let offset = Buffer.byteLength(header, "latin1");
		for (const obj of objects) {
			offsets.push(offset);
			const chunk = `${obj}\n`;
			body += chunk;
			offset += Buffer.byteLength(chunk, "latin1");
		}
		const xrefStart = offset;
		const totalObjects = objects.length + 1;
		let xref = `xref\n0 ${totalObjects}\n0000000000 65535 f \n`;
		for (let i = 1; i < totalObjects; i++) xref += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
		const trailer = `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
		return Buffer.from(header + body + xref + trailer, "latin1");
	}
};

//#endregion
//#region src/brewing/yaml-to-pdf.ts
/**
* YAML to PDF converter — converts a beer recipe YAML to a styled PDF.
* Uses the dependency-free `PDFLite` shim (see ../shim/pdf-lite.ts) instead of
* pdfkit, so the MCP server can ship as a single bundled file.
*/
const YamlToPdfInputSchema = object({
	input_file: string().describe("Path to the recipe YAML file."),
	output_file: string().optional().describe("Path for the output .pdf file.")
});
const MARGIN = 50;
const USABLE_W = 495;
const COLOR_PRIMARY = "#c0392b";
const COLOR_TEXT = "#1a1a1a";
const COLOR_MUTED = "#7f8c8d";
function yamlToPdf(inputPath, outputPath) {
	const raw = readFileSync(inputPath, "utf-8");
	const data = load(raw) ?? {};
	const doc = new PDFLite({
		size: "A4",
		margins: {
			top: 50,
			bottom: 50,
			left: 50,
			right: 50
		}
	});
	let y = doc.y;
	doc.font("Helvetica-Bold").fontSize(22).fillColor(COLOR_PRIMARY).text(String(data["nome"] ?? "Ricetta di Birra"), MARGIN, y, { align: "center" });
	y = doc.y + 12;
	if (data["stile"]) {
		doc.font("Helvetica-Oblique").fontSize(12).fillColor(COLOR_MUTED).text(String(data["stile"]), MARGIN, y, { align: "center" });
		y = doc.y + 16;
	}
	if (data["descrizione"]) {
		y += 4;
		doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text(String(data["descrizione"]), MARGIN, y, {
			width: USABLE_W,
			align: "left"
		});
		y = doc.y + 12;
	}
	function section(title) {
		if (doc.y > 762) doc.addPage();
		const sy = doc.y + 6;
		doc.font("Helvetica-Bold").fontSize(14).fillColor(COLOR_PRIMARY).text(title, MARGIN, sy);
		doc.moveTo(MARGIN, doc.y + 3).lineTo(545, doc.y + 3).strokeColor(COLOR_PRIMARY).lineWidth(1.5).stroke();
		return doc.y + 9;
	}
	/**
	* Render a YAML value as a list of lines with proper indentation, so nested
	* objects and arrays of objects read like a JSON-serialized structure
	* instead of a flat `[object Object]` blob.
	*/
	function valueLines(value, indent) {
		if (value == null) return ["-"];
		if (typeof value === "string") return [value];
		if (typeof value === "number" || typeof value === "boolean") return [String(value)];
		if (Array.isArray(value)) {
			if (value.length === 0) return ["-"];
			const lines = [];
			for (const item of value) if (typeof item === "object" && item !== null) {
				const entries = Object.entries(item);
				if (entries.length === 0) {
					lines.push("• -");
					continue;
				}
				const [firstKey, firstVal] = entries[0];
				const firstLines = valueLines(firstVal, indent + 1);
				lines.push(`• ${firstKey}: ${firstLines[0] ?? ""}`);
				for (let i = 1; i < firstLines.length; i++) lines.push(`  ${firstLines[i]}`);
				for (let i = 1; i < entries.length; i++) {
					const [k, v] = entries[i];
					const vLines = valueLines(v, indent + 1);
					lines.push(`  ${k}: ${vLines[0] ?? ""}`);
					for (let j = 1; j < vLines.length; j++) lines.push(`    ${vLines[j]}`);
				}
			} else lines.push(`• ${valueLines(item, indent + 1)[0] ?? ""}`);
			return lines;
		}
		if (typeof value === "object") {
			const entries = Object.entries(value);
			if (entries.length === 0) return ["-"];
			const lines = [];
			for (const [k, v] of entries) {
				const vLines = valueLines(v, indent + 1);
				lines.push(`${k}: ${vLines[0] ?? ""}`);
				for (let i = 1; i < vLines.length; i++) lines.push(`  ${vLines[i]}`);
			}
			return lines;
		}
		return [String(value)];
	}
	function kv(label, value) {
		const lines = valueLines(value, 0);
		const isComplex = Array.isArray(value) || typeof value === "object" && value !== null;
		if (doc.y > 792) doc.addPage();
		if (isComplex) {
			doc.font("Helvetica-Bold").fontSize(10).fillColor("#555555").text(label + ":", MARGIN, doc.y + 1, { lineGap: 4 });
			for (const line of lines) {
				if (doc.y > 792) doc.addPage();
				doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text(line, 62, doc.y + 1, {
					width: 483,
					lineGap: 4
				});
			}
		} else doc.font("Helvetica-Bold").fontSize(10).fillColor("#555555").text(label + ": ", MARGIN, doc.y + 1, {
			continued: true,
			lineGap: 4
		}).font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text(lines[0] ?? "-", { lineGap: 4 });
		return doc.y;
	}
	/**
	* Render a top-level section generically: an array of strings becomes a
	* bulleted list (one line per item), an array of objects becomes a list of
	* indented blocks, and a plain object becomes key/value lines.
	*/
	function renderSection(title, value) {
		doc.y = section(title);
		if (Array.isArray(value)) for (const item of value) if (typeof item === "object" && item !== null) {
			const lines = valueLines(item, 0);
			for (const line of lines) {
				if (doc.y > 792) doc.addPage();
				doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text(line, 60, doc.y + 1, {
					width: 485,
					lineGap: 4
				});
			}
			doc.y += 2;
		} else {
			if (doc.y > 792) doc.addPage();
			doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text("• " + String(item), 60, doc.y + 1, {
				width: 485,
				lineGap: 4
			});
		}
		else if (typeof value === "object" && value !== null) for (const [k, v] of Object.entries(value)) {
			const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
			doc.y = kv(label, v);
		}
		else {
			if (doc.y > 792) doc.addPage();
			doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text(String(value), 60, doc.y + 1, {
				width: 485,
				lineGap: 4
			});
		}
		return doc.y + 4;
	}
	function simpleTable(header, rows, colWidths) {
		if (doc.y > 722) doc.addPage();
		const tableTop = doc.y + 4;
		const rowH = 18;
		let x = MARGIN;
		for (let c = 0; c < header.length; c++) {
			doc.rect(x, tableTop, colWidths[c], rowH).fill(COLOR_PRIMARY);
			doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text(header[c], x + 3, tableTop + 4, {
				width: colWidths[c] - 6,
				align: "left"
			});
			x += colWidths[c];
		}
		let ry = tableTop + rowH;
		for (let ri = 0; ri < rows.length; ri++) {
			if (ry > 782) {
				doc.addPage();
				ry = MARGIN;
			}
			x = MARGIN;
			const fill = ri % 2 === 0 ? "#fafafa" : "#ffffff";
			for (let c = 0; c < header.length; c++) {
				doc.rect(x, ry, colWidths[c], rowH).fill(fill);
				doc.font("Helvetica").fontSize(9).fillColor(COLOR_TEXT).text(rows[ri]?.[c] ?? "-", x + 3, ry + 4, { width: colWidths[c] - 6 });
				x += colWidths[c];
			}
			ry += rowH;
		}
		return ry + 6;
	}
	const params = data["parametri"];
	if (params && Object.keys(params).length > 0) {
		y = section("Parametri");
		for (const [k, v] of Object.entries(params)) y = kv(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v);
		y += 6;
	}
	const grist = data["grist"];
	if (grist && grist.length > 0) {
		y = section("Grist");
		y = simpleTable([
			"Malto",
			"Kg",
			"%",
			"Note"
		], grist.map((g) => [
			String(g["malto"] ?? ""),
			String(g["kg"] ?? ""),
			String(g["percent"] ?? ""),
			String(g["note"] ?? "")
		]), [
			200,
			50,
			50,
			195
		]);
	}
	const hops = data["luppolatura"];
	if (hops && hops.length > 0) {
		y = section("Luppolatura");
		y = simpleTable([
			"Varietà",
			"g",
			"Tempo",
			"Uso",
			"AA%",
			"IBU",
			"Note"
		], hops.map((h) => [
			String(h["varieta"] ?? ""),
			String(h["grammi"] ?? ""),
			String(h["tempo_min"] ?? ""),
			String(h["uso"] ?? ""),
			String(h["aa_percent"] ?? ""),
			String(h["ibu_stimati"] ?? ""),
			String(h["note"] ?? "")
		]), [
			110,
			45,
			50,
			55,
			45,
			45,
			145
		]);
	}
	for (const sec of [
		"lievito",
		"acqua",
		"mash",
		"bollitura",
		"fermentazione",
		"carbonazione"
	]) {
		const obj = data[sec];
		if (obj && Object.keys(obj).length > 0) {
			doc.y = section(sec.charAt(0).toUpperCase() + sec.slice(1));
			for (const [k, v] of Object.entries(obj)) y = kv(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v);
			y += 4;
		}
	}
	const notes = data["note_critiche"];
	if (notes) {
		y = section("Note Critiche");
		const items = Array.isArray(notes) ? notes : String(notes).split("\n");
		for (const n of items) {
			const trimmed = String(n).trim();
			if (!trimmed) continue;
			if (doc.y > 802) doc.addPage();
			doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT).text("• " + trimmed, 60, doc.y + 2, {
				width: 485,
				lineGap: 4
			});
		}
		y = doc.y;
	}
	const alts = data["alternative"];
	if (alts && alts.length > 0) {
		y = section("Alternative");
		for (const a of alts) {
			if (doc.y > 792) doc.addPage();
			doc.font("Helvetica-Bold").fontSize(10).fillColor(COLOR_TEXT).text("• " + String(a["descrizione"] ?? ""), 60, doc.y + 2, {
				width: 485,
				lineGap: 4
			});
			if (a["cambiamenti"]) doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Cambiamenti: " + String(a["cambiamenti"]), 70, doc.y + 1, {
				width: 475,
				lineGap: 4
			});
			if (a["impatto"]) doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("Impatto: " + String(a["impatto"]), 70, doc.y + 1, {
				width: 475,
				lineGap: 4
			});
			doc.y += 2;
		}
	}
	const handled = /* @__PURE__ */ new Set([
		"nome",
		"stile",
		"descrizione",
		"parametri",
		"grist",
		"luppolatura",
		"lievito",
		"acqua",
		"mash",
		"bollitura",
		"fermentazione",
		"carbonazione",
		"note_critiche",
		"alternative"
	]);
	for (const [key, value] of Object.entries(data)) {
		if (handled.has(key)) continue;
		if (value == null) continue;
		y = renderSection(key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), value);
	}
	doc.y += 10;
	doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLOR_MUTED).text("Generato da Maestra Birraia AI — Kimi Code Brewing Assistant", MARGIN, doc.y, { align: "center" });
	doc.save(outputPath);
	return outputPath;
}
var YamlToPdfTool = class {
	name = "yaml_to_pdf";
	description = "Convert a beer recipe YAML file to a professionally styled PDF document. Uses pdfkit for reliable PDF generation.";
	parameters = toInputJsonSchema(YamlToPdfInputSchema);
	resolveExecution(args) {
		const inputFile = args.input_file;
		const outputFile = args.output_file ?? inputFile.replace(/\.ya?ml$/i, "") + ".pdf";
		return {
			description: `Convert ${inputFile} → PDF`,
			approvalRule: this.name,
			execute: () => {
				try {
					if (!existsSync(inputFile)) return Promise.resolve({
						isError: true,
						output: `File not found: ${inputFile}`
					});
					const result = yamlToPdf(inputFile, outputFile);
					return Promise.resolve({ output: `PDF saved: ${result}` });
				} catch (error) {
					return Promise.resolve({
						isError: true,
						output: error instanceof Error ? error.message : String(error)
					});
				}
			}
		};
	}
};
registerTool(YamlToPdfTool);

//#endregion
//#region src/brewing/memory-store.ts
/**
* Brewing memory store — persistent cross-session memory for the brassicolo profile.
*
* Stores and retrieves brewing-related facts (user preferences, equipment,
* recurring constraints, learned preferences) across sessions.
*
* Data lives under the per-user data root (`.brewing-data` inside the user's
* chroot when a user is attached, else `~/.kimi-code/brewing`).
*/
const MEMORY_FILE = "memory.json";
function memoryPath(root) {
	return join(root, MEMORY_FILE);
}
function ensureDir(root) {
	const dir = dirname(memoryPath(root));
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
/** Read all memory entries from disk. Returns empty array if file doesn't exist. */
function loadMemories(root) {
	const path = memoryPath(root);
	if (!existsSync(path)) return [];
	try {
		const raw = readFileSync(path, "utf-8");
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && "entries" in parsed) {
			const file = parsed;
			if (file.version === 1 && Array.isArray(file.entries)) return file.entries;
		}
		return [];
	} catch {
		return [];
	}
}
/** Save a new memory entry (or update existing by key). */
function saveMemory(root, entry) {
	ensureDir(root);
	const memories = loadMemories(root);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const existing = memories.findIndex((m) => m.key === entry.key);
	if (existing >= 0) memories[existing] = {
		...memories[existing],
		content: entry.content,
		category: entry.category,
		updatedAt: now
	};
	else memories.push({
		...entry,
		createdAt: now,
		updatedAt: now
	});
	const file = {
		version: 1,
		entries: memories
	};
	writeFileSync(memoryPath(root), JSON.stringify(file, null, 2), "utf-8");
}
/** Delete a memory entry by key. Returns true if deleted. */
function deleteMemory(root, key) {
	const memories = loadMemories(root);
	const idx = memories.findIndex((m) => m.key === key);
	if (idx < 0) return false;
	memories.splice(idx, 1);
	const file = {
		version: 1,
		entries: memories
	};
	writeFileSync(memoryPath(root), JSON.stringify(file, null, 2), "utf-8");
	return true;
}
/** Search memories by query (searches key, category, and content fields). */
function searchMemories(root, query) {
	const q = query.toLowerCase();
	return loadMemories(root).filter((m) => m.key.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
}
/** Get all memories grouped by category. */
function getMemoriesByCategory(root) {
	const groups = {};
	for (const m of loadMemories(root)) (groups[m.category] ??= []).push(m);
	return groups;
}

//#endregion
//#region src/brewing/memory-toggle.ts
/**
* Memory toggle tool — enable or disable persistent memory for this session.
* When disabled, memory_save is a no-op and the agent won't read/write memories.
*/
const MemoryToggleInputSchema = object({ enabled: boolean().describe("true = enable memory (default), false = disable (temporary session).") });
/** Module-level flag: when false, memory_save is a no-op. Default true. */
let memoryEnabled = true;
function isMemoryEnabled() {
	return memoryEnabled;
}
var MemoryToggleTool = class {
	name = "memory_toggle";
	description = "Enable or disable persistent cross-session memory. Use to start a temporary session where nothing is remembered.";
	parameters = toInputJsonSchema(MemoryToggleInputSchema);
	resolveExecution(args) {
		return {
			description: `Memory ${args.enabled ? "enabled" : "disabled"}`,
			approvalRule: this.name,
			execute: () => {
				memoryEnabled = args.enabled;
				return Promise.resolve({ output: args.enabled ? "Memoria cross-session **attivata**. Le informazioni importanti verranno ricordate tra una chat e l'altra." : "Memoria cross-session **disattivata**. Questa è una sessione temporanea — nulla verrà ricordato." });
			}
		};
	}
};
registerTool(MemoryToggleTool);

//#endregion
//#region src/brewing/memory-save.ts
/**
* Memory save tool — persistently remembers a fact across sessions.
*/
const MemorySaveInputSchema = object({
	key: string().describe("Short identifier for this memory (e.g. \"brewzilla_efficiency\", \"preferred_hops\")."),
	category: _enum([
		"equipment",
		"preference",
		"constraint",
		"goal",
		"note",
		"technique",
		"ingredient",
		"water",
		"other",
		"recipe",
		"brewday"
	]).describe("Categoria della memoria. Valori validi: equipment, preference, constraint, goal, note, technique, ingredient, water, other, recipe, brewday."),
	content: string().describe("The fact or preference to remember, written as a complete sentence.")
});
var MemorySaveTool = class {
	name = "memory_save";
	description = "Persistently remember a brewing-related fact or preference across sessions. Use for equipment specs, user preferences, recurring goals, or learned constraints.";
	parameters = toInputJsonSchema(MemorySaveInputSchema);
	resolveExecution(args) {
		const root = dataRoot(args);
		return {
			description: `Remember: ${args.key}`,
			approvalRule: this.name,
			execute: () => {
				try {
					if (!isMemoryEnabled()) return Promise.resolve({ output: "Memoria disattivata (sessione temporanea). Il dato non è stato salvato." });
					saveMemory(root, {
						key: args.key,
						category: args.category,
						content: args.content
					});
					return Promise.resolve({ output: `Memorizzato: [${args.category}] ${args.content} (key: ${args.key})` });
				} catch (error) {
					return Promise.resolve({
						isError: true,
						output: error instanceof Error ? error.message : String(error)
					});
				}
			}
		};
	}
};
registerTool(MemorySaveTool);

//#endregion
//#region src/brewing/memory-search.ts
/**
* Memory search tool — retrieves persisted brewing memories.
* Can search, list all, list by category, or delete memories.
*/
const MemorySearchInputSchema = object({
	action: _enum([
		"search",
		"list",
		"by_category",
		"delete",
		"summary"
	]).describe("Action: search (by query), list (all), by_category, delete, or summary (condensed)."),
	query: string().optional().describe("Search query for action=search."),
	category: string().optional().describe("Category filter for action=by_category. Valori: equipment, preference, constraint, goal, note, technique, ingredient, water, other, recipe."),
	key: string().optional().describe("Memory key to delete (for action=delete).")
});
var MemorySearchTool = class {
	name = "memory_search";
	description = "Search, list, or delete persisted brewing memories. Use to recall user preferences, equipment specs, and learned facts from previous sessions.";
	parameters = toInputJsonSchema(MemorySearchInputSchema);
	resolveExecution(args) {
		const root = dataRoot(args);
		return {
			description: `Memory ${args.action}: ${args.query ?? args.category ?? "all"}`,
			approvalRule: this.name,
			execute: () => {
				try {
					switch (args.action) {
						case "search": {
							const q = args.query ?? "";
							const results = searchMemories(root, q);
							if (results.length === 0) return Promise.resolve({ output: `Nessun ricordo trovato per "${q}".` });
							const lines = [`**${results.length} ricordi trovati:**`, ""];
							for (const m of results) lines.push(`- [${m.category}] **${m.key}**: ${m.content} (aggiornato: ${m.updatedAt.slice(0, 10)})`);
							return Promise.resolve({ output: lines.join("\n") });
						}
						case "list": {
							const all = loadMemories(root);
							if (all.length === 0) return Promise.resolve({ output: "Nessun ricordo salvato." });
							const lines = [`**${all.length} ricordi salvati:**`, ""];
							for (const m of all) lines.push(`- [${m.category}] **${m.key}**: ${m.content}`);
							return Promise.resolve({ output: lines.join("\n") });
						}
						case "by_category": {
							const groups = getMemoriesByCategory(root);
							const category = args.category;
							if (category && groups[category]) {
								const lines = [`**${category} (${groups[category].length} ricordi):**`, ""];
								for (const m of groups[category]) lines.push(`- **${m.key}**: ${m.content}`);
								return Promise.resolve({ output: lines.join("\n") });
							}
							const lines = ["**Ricordi per categoria:**", ""];
							for (const [cat, entries] of Object.entries(groups)) {
								lines.push(`## ${cat} (${entries.length})`);
								for (const m of entries) lines.push(`- **${m.key}**: ${m.content}`);
								lines.push("");
							}
							return Promise.resolve({ output: lines.join("\n") });
						}
						case "delete": {
							if (!args.key) return Promise.resolve({
								isError: true,
								output: "key is required for delete action."
							});
							const ok = deleteMemory(root, args.key);
							return Promise.resolve({ output: ok ? `Ricordo "${args.key}" eliminato.` : `Ricordo "${args.key}" non trovato.` });
						}
						case "summary": {
							const all = loadMemories(root);
							if (all.length === 0) return Promise.resolve({ output: "Nessun ricordo salvato." });
							const groups = getMemoriesByCategory(root);
							const lines = [`**${all.length} ricordi — Riepilogo**`, ""];
							for (const [cat, entries] of Object.entries(groups)) {
								lines.push(`**${cat}:**`);
								for (const m of entries) lines.push(`  • ${m.content}`);
								lines.push("");
							}
							return Promise.resolve({ output: lines.join("\n") });
						}
					}
				} catch (error) {
					return Promise.resolve({
						isError: true,
						output: error instanceof Error ? error.message : String(error)
					});
				}
			}
		};
	}
};
registerTool(MemorySearchTool);

//#endregion
//#region src/brewing/recipe-list.ts
/**
* Recipe list tool — scans the workspace for beer recipe YAML files.
*
* Searches recursively for .yaml/.yml files, parses them, and returns
* a list of recipes with key parameters. Supports filtering by style,
* ingredient keyword, and limiting search depth.
*/
const RecipeListInputSchema = object({
	search_dir: string().optional().describe("Directory to scan. Defaults to the current workspace directory. Use ~ to refer to home directory."),
	filter: string().optional().describe("Filter recipes by keyword. Searches in recipe name, style, description, and ingredients. Examples: \"rum\", \"IPA\", \"lambic\", \"miele\"."),
	max_depth: number().int().min(1).max(10).default(6).describe("Max directory depth for recursive scan. Default 6.")
});
function isRecipeYaml(data) {
	const params = data["parametri"];
	return typeof data["nome"] === "string" && typeof params === "object" && params !== null && (typeof params["og"] === "number" || typeof params["batch_size_litri"] === "number") && (Array.isArray(data["grist"]) || Array.isArray(data["luppolatura"]));
}
function parseRecipeYaml(filePath) {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const data = load(raw);
		if (typeof data !== "object" || data === null) return null;
		const d = data;
		if (!isRecipeYaml(d)) return null;
		const params = d["parametri"];
		const grist = Array.isArray(d["grist"]) ? d["grist"] : [];
		const luppolatura = Array.isArray(d["luppolatura"]) ? d["luppolatura"] : [];
		const lievito = d["lievito"];
		return {
			path: filePath,
			nome: String(d["nome"] ?? "Sconosciuta"),
			stile: String(d["stile"] ?? "Non specificato"),
			parametri: {
				batch_size_litri: typeof params["batch_size_litri"] === "number" ? params["batch_size_litri"] : void 0,
				og: typeof params["og"] === "number" ? params["og"] : void 0,
				fg: typeof params["fg"] === "number" ? params["fg"] : void 0,
				abv_percent: typeof params["abv_percent"] === "number" ? params["abv_percent"] : void 0,
				ibu: typeof params["ibu"] === "number" ? params["ibu"] : void 0,
				ebc: typeof params["ebc"] === "number" ? params["ebc"] : void 0,
				impianto: typeof params["impianto"] === "string" ? params["impianto"] : void 0
			},
			ingredienti_principali: {
				malti: grist.map((m) => String(m["malto"] ?? "")).filter(Boolean),
				luppoli: luppolatura.map((h) => String(h["varieta"] ?? "")).filter(Boolean),
				lievito: lievito?.["ceppo"] ? String(lievito["ceppo"]) : "Non specificato",
				spezie: Array.isArray(d["spezie"]) ? d["spezie"].map((s) => String(s["nome"] ?? "")).filter(Boolean) : void 0,
				zuccheri: Array.isArray(d["zuccheri"]) ? d["zuccheri"].map((z) => String(z["tipo"] ?? "")).filter(Boolean) : void 0
			}
		};
	} catch {
		return null;
	}
}
function scanYamlFiles(dir, maxDepth, currentDepth = 0) {
	if (currentDepth > maxDepth) return [];
	const results = [];
	try {
		const entries = readdirSync(dir);
		for (const entry of entries) {
			const fullPath = join(dir, entry);
			try {
				const st = statSync(fullPath);
				if (st.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") results.push(...scanYamlFiles(fullPath, maxDepth, currentDepth + 1));
				else if (st.isFile() && (entry.endsWith(".yaml") || entry.endsWith(".yml"))) results.push(fullPath);
			} catch {}
		}
	} catch {}
	return results;
}
function recipeMatchesFilter(recipe, filter) {
	const f = filter.toLowerCase();
	if (recipe.nome.toLowerCase().includes(f)) return true;
	if (recipe.stile.toLowerCase().includes(f)) return true;
	if (recipe.ingredienti_principali.malti.some((m) => m.toLowerCase().includes(f))) return true;
	if (recipe.ingredienti_principali.luppoli.some((h) => h.toLowerCase().includes(f))) return true;
	if (recipe.ingredienti_principali.lievito.toLowerCase().includes(f)) return true;
	if (recipe.ingredienti_principali.spezie?.some((s) => s.toLowerCase().includes(f))) return true;
	if (recipe.ingredienti_principali.zuccheri?.some((z) => z.toLowerCase().includes(f))) return true;
	return false;
}
function formatRecipeSummary(r) {
	const p = r.parametri;
	const parts = [];
	parts.push(`**${r.nome}** — ${r.stile}`);
	if (p.og) parts.push(`OG: ${p.og.toFixed(3)}`);
	if (p.fg) parts.push(`FG: ${p.fg.toFixed(3)}`);
	if (p.abv_percent) parts.push(`ABV: ${p.abv_percent}%`);
	if (p.ibu) parts.push(`IBU: ${p.ibu}`);
	if (p.ebc) parts.push(`EBC: ${p.ebc}`);
	if (p.batch_size_litri) parts.push(`Batch: ${p.batch_size_litri}L`);
	if (p.impianto) parts.push(`Impianto: ${p.impianto}`);
	const header = parts.join(" | ");
	const details = [];
	details.push(`📄 \`${r.path}\``);
	if (r.ingredienti_principali.malti.length > 0) details.push(`🌾 Malti: ${r.ingredienti_principali.malti.slice(0, 8).join(", ")}${r.ingredienti_principali.malti.length > 8 ? "..." : ""}`);
	if (r.ingredienti_principali.luppoli.length > 0) details.push(`🌿 Luppoli: ${r.ingredienti_principali.luppoli.join(", ")}`);
	details.push(`🧫 Lievito: ${r.ingredienti_principali.lievito}`);
	if (r.ingredienti_principali.spezie?.length) details.push(`🌶️ Spezie: ${r.ingredienti_principali.spezie.join(", ")}`);
	if (r.ingredienti_principali.zuccheri?.length) details.push(`🍯 Zuccheri: ${r.ingredienti_principali.zuccheri.join(", ")}`);
	return `${header}\n  ${details.join("\n  ")}`;
}
function resolveDir(searchDir) {
	if (!searchDir) return process.cwd();
	if (searchDir.startsWith("~")) {
		const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "/";
		return join(home, searchDir.slice(1));
	}
	return resolve(searchDir);
}
var RecipeListTool = class {
	name = "recipe_list";
	description = "Scansiona il workspace alla ricerca di file .yaml/.yml di ricette brassicole. Restituisce un elenco con nome, stile, parametri (OG/FG/ABV/IBU/EBC), ingredienti principali e percorso file. Supporta filtro per stile, ingrediente o parola chiave (es. \"rum\", \"IPA\", \"sour\", \"miele\").";
	parameters = toInputJsonSchema(RecipeListInputSchema);
	resolveExecution(args) {
		return {
			description: `Recipe list${args.filter ? ` for "${args.filter}"` : ""}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const dir = resolveDir(args.search_dir);
			const recipes = scanYamlFiles(dir, args.max_depth).map((f) => parseRecipeYaml(f)).filter((r) => r !== null);
			if (recipes.length === 0) return Promise.resolve({ output: `Nessuna ricetta trovata in \`${dir}\`.` });
			let filtered = recipes;
			if (args.filter) {
				const f = args.filter;
				filtered = recipes.filter((r) => recipeMatchesFilter(r, f));
				if (filtered.length === 0) return Promise.resolve({ output: `Nessuna ricetta corrisponde al filtro "${args.filter}" (${recipes.length} ricette totali trovate in \`${dir}\`).` });
			}
			const lines = [`**${filtered.length} ricetta/e trovata/e${args.filter ? ` per "${args.filter}"` : ""}** in \`${dir}\` (${recipes.length} totali)`, ""];
			filtered.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
			for (const r of filtered) {
				lines.push(formatRecipeSummary(r));
				lines.push("");
			}
			return Promise.resolve({ output: lines.join("\n") });
		} catch (error) {
			return Promise.resolve({
				isError: true,
				output: error instanceof Error ? error.message : String(error)
			});
		}
	}
};
registerTool(RecipeListTool);

//#endregion
//#region src/brewing/recipes/01-standard-american/1A-american-light-lager.yaml?raw
var _1A_american_light_lager_default = "nome: \"Comrade John & Tim's American Light\"\nstile: \"American Light Lager\"\ncodice_bjcp: \"1A\"\ndescrizione: |\n  Light lager americana premiata (Best of Show, 21st Dixie Cup), molto attenuata e\n  pulita, con base di Pilsner e cereali in fiocchi per un profilo secco e croccante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/comrade-john-tims-american-light/\"\n  autore: \"BYO Staff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.042\n  fg: 1.007\n  abv_percent: 4.5\n  ibu: 19\n  ebc: 12\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner tedesco\"\n    kg: 2.04\n    percent: 51.4\n    note: \"Malto base\"\n  - malto: \"Pilsner belga\"\n    kg: 1.13\n    percent: 28.6\n    note: \"Malto base\"\n  - malto: \"Fiocchi di mais\"\n    kg: 0.46\n    percent: 11.4\n    note: \"Secchezza e corpo leggero\"\n  - malto: \"Fiocchi di riso\"\n    kg: 0.34\n    percent: 8.6\n    note: \"Secchezza\"\n\nluppolatura:\n  - varieta: \"UK First Gold\"\n    grammi: 7.8\n    tempo_min: 50\n    uso: boil\n  - varieta: \"UK First Gold\"\n    grammi: 7.8\n    tempo_min: 40\n    uso: boil\n  - varieta: \"E. Kent Goldings\"\n    grammi: 7.8\n    tempo_min: 30\n    uso: boil\n  - varieta: \"E. Kent Goldings\"\n    grammi: 7.8\n    tempo_min: 20\n    uso: boil\n  - varieta: \"Mount Hood\"\n    grammi: 14.2\n    tempo_min: 15\n    uso: boil\n  - varieta: \"Hallertauer\"\n    grammi: 4.3\n    tempo_min: 5\n    uso: boil\n\nlievito:\n  ceppo: \"Wyeast 2007 (Pilsen Lager)\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"12°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Infusione semplice 67-70°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 12\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 1\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Lagering lungo per un profilo molto pulito\"\n  - \"Cereali in fiocchi per corpo leggero e secco\"\n\nalternative:\n  - descrizione: \"Versione più attenuata\"\n    cambiamenti: \"Aumentare i fiocchi di mais a 15%\"\n    impatto: \"Corpo ancora più leggero e secco\"\n";

//#endregion
//#region src/brewing/recipes/01-standard-american/1B-american-lager.yaml?raw
var _1B_american_lager_default = "nome: \"Dad's American Lager\"\nstile: \"American Lager\"\ncodice_bjcp: \"1B\"\ndescrizione: |\n  American lager pulita e bilanciata, base di 6-row/2-row con mais e riso.\n  Punto di partenza versatile per molte varianti.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/dads-american-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.046\n  fg: 1.009\n  abv_percent: 4.8\n  ibu: 16\n  ebc: 7\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale 6-row\"\n    kg: 1.8\n    percent: 40\n    note: \"Malto base\"\n  - malto: \"Pale 2-row\"\n    kg: 1.8\n    percent: 40\n    note: \"Malto base\"\n  - malto: \"Mais in fiocchi\"\n    kg: 0.45\n    percent: 10\n    note: \"Secchezza\"\n  - malto: \"Riso in fiocchi\"\n    kg: 0.45\n    percent: 10\n    note: \"Secchezza\"\n\nluppolatura:\n  - varieta: \"Hallertauer\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n\nlievito:\n  ceppo: \"White Labs WLP940 (Mexican Lager) / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 6-8 settimane a 0°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Lagering lungo per profilo pulito\"\n  - \"Mais e riso per corpo leggero\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Sostituire il riso con Vienna\"\n    impatto: \"Corpo leggermente più pieno\"\n";

//#endregion
//#region src/brewing/recipes/01-standard-american/1C-cream-ale.yaml?raw
var _1C_cream_ale_default = "nome: \"Gordon Strong's Cream Ale\"\nstile: \"Cream Ale\"\ncodice_bjcp: \"1C\"\ndescrizione: |\n  Cream ale liscia e rinfrescante con mais in fiocchi e zucchero, fermentata con\n  lievito ale ma lagering a freddo per un profilo pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-cream-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.010\n  abv_percent: 5.6\n  ibu: 14\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner tedesco\"\n    kg: 1.6\n    percent: 35\n    note: \"Malto base\"\n  - malto: \"2-row USA\"\n    kg: 1.6\n    percent: 35\n    note: \"Malto base\"\n  - malto: \"Mais in fiocchi\"\n    kg: 0.91\n    percent: 20\n    note: \"Secchezza e corpo\"\n  - malto: \"Zucchero di mais\"\n    kg: 0.45\n    percent: 10\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Vanguard\"\n    grammi: 7\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Vanguard\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n  - varieta: \"Vanguard\"\n    grammi: 7\n    tempo_min: 5\n    uso: boil\n\nlievito:\n  ceppo: \"Wyeast 1056 / White Labs WLP001 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"17-18°C\"\n  note: \"Lievito ale pulito, lagering a freddo\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 4\n  cold_crash_temp_c: 1\n  note: \"Lagering 4 settimane a 0-1°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Fermentare con lievito ale ma lagering a freddo\"\n  - \"Zucchero di mais per attenuazione elevata\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare lo zucchero di mais\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/01-standard-american/1D-american-wheat.yaml?raw
var _1D_american_wheat_default = "nome: \"Gordon Strong's American Wheat\"\nstile: \"American Wheat Beer\"\ncodice_bjcp: \"1D\"\ndescrizione: |\n  American wheat equilibrata con frumento tedesco e luppoli nobili, dry-hopped\n  con Cascade per un tocco americano.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/american-wheat/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.054\n  fg: 1.013\n  abv_percent: 5.3\n  ibu: 21\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Malto di frumento tedesco\"\n    kg: 2.5\n    percent: 50\n    note: \"Frumento\"\n  - malto: \"2-row Nord America\"\n    kg: 1.8\n    percent: 36.4\n    note: \"Malto base\"\n  - malto: \"Munich\"\n    kg: 0.45\n    percent: 9.1\n    note: \"Corpo\"\n  - malto: \"Caravienne (o caramel 20L)\"\n    kg: 0.23\n    percent: 4.5\n    note: \"Dolcezza leggera\"\n\nluppolatura:\n  - varieta: \"Czech Saaz\"\n    grammi: 21\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Hallertauer\"\n    grammi: 21\n    tempo_min: 20\n    uso: boil\n  - varieta: \"Hallertauer\"\n    grammi: 21\n    tempo_min: 10\n    uso: boil\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n  - varieta: \"Cascade\"\n    grammi: 28\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop 3 giorni\"\n\nlievito:\n  ceppo: \"Wyeast 1272 (American Ale II) / White Labs WLP051\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Decozione: 55°C 10min, step fino a 70°C 20min, mash out 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  dry_hop_giorno: 7\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Dry hop con Cascade per carattere americano\"\n  - \"Frumento tedesco per corpo morbido\"\n\nalternative:\n  - descrizione: \"Versione senza dry hop\"\n    cambiamenti: \"Omettere il dry hop Cascade\"\n    impatto: \"Profilo più pulito e tradizionale\"\n";

//#endregion
//#region src/brewing/recipes/02-international-lager/2A-international-pale-lager.yaml?raw
var _2A_international_pale_lager_default = "nome: \"Mexican Lager\"\nstile: \"International Pale Lager\"\ncodice_bjcp: \"2A\"\ndescrizione: |\n  Mexican lager pulita e croccante con Vienna e mais in fiocchi, bassa amarezza\n  e profilo molto attenuato.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/mexican-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.011\n  abv_percent: 5.0\n  ibu: 19\n  ebc: 7\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner tedesco\"\n    kg: 1.6\n    percent: 34.1\n    note: \"Malto base\"\n  - malto: \"2-row USA\"\n    kg: 0.91\n    percent: 19.5\n    note: \"Malto base\"\n  - malto: \"Vienna tedesco\"\n    kg: 0.91\n    percent: 19.5\n    note: \"Corpo maltato\"\n  - malto: \"Mais in fiocchi\"\n    kg: 1.25\n    percent: 26.8\n    note: \"Secchezza\"\n\nluppolatura:\n  - varieta: \"Tettnanger\"\n    grammi: 9\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Tettnanger\"\n    grammi: 19\n    tempo_min: 45\n    uso: boil\n  - varieta: \"Tettnanger\"\n    grammi: 14\n    tempo_min: 5\n    uso: boil\n\nlievito:\n  ceppo: \"White Labs WLP940 (Mexican Lager) / Lallemand Diamond Lager\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 4-8 settimane a 0°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Lagering lungo per profilo pulito\"\n  - \"Vienna per corpo maltato senza dolcezza\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare il mais in fiocchi\"\n    impatto: \"Corpo più leggero\"\n";

//#endregion
//#region src/brewing/recipes/02-international-lager/2B-international-amber-lager.yaml?raw
var _2B_international_amber_lager_default = "nome: \"Gordon Strong's International Amber Lager\"\nstile: \"International Amber Lager\"\ncodice_bjcp: \"2B\"\ndescrizione: |\n  Amber lager internazionale con note caramello/toast, malto scuro solo per colore,\n  amarezza contenuta e finitura pulita.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/style-profile-9/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.011\n  abv_percent: 5.4\n  ibu: 17\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row USA\"\n    kg: 2.0\n    percent: 41.7\n    note: \"Malto base\"\n  - malto: \"Pilsner\"\n    kg: 1.8\n    percent: 37.1\n    note: \"Malto base\"\n  - malto: \"Munich\"\n    kg: 0.45\n    percent: 9.3\n    note: \"Corpo maltato\"\n  - malto: \"Crystal UK (45L)\"\n    kg: 0.34\n    percent: 7.0\n    note: \"Caramello\"\n  - malto: \"Chocolate malt\"\n    kg: 0.11\n    percent: 2.3\n    note: \"Colore\"\n  - malto: \"Weyermann Carared\"\n    kg: 0.11\n    percent: 2.3\n    note: \"Colore rosso\"\n  - malto: \"Weyermann Carafa Special II\"\n    kg: 0.014\n    percent: 0.3\n    note: \"Colore scuro\"\n\nluppolatura:\n  - varieta: \"Crystal\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n  - varieta: \"Crystal\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n\nlievito:\n  ceppo: \"SafLager W-34/70 / Wyeast 2124 (Bohemian Lager)\"\n  forma: secco\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 12 settimane a 0°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Malto scuro solo per colore, non per sapore\"\n  - \"Lagering lungo per finitura pulita\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre Carafa e chocolate\"\n    impatto: \"Colore più ambrato chiaro\"\n";

//#endregion
//#region src/brewing/recipes/02-international-lager/2C-international-dark-lager.yaml?raw
var _2C_international_dark_lager_default = "nome: \"Gordon Strong's International Dark Lager\"\nstile: \"International Dark Lager\"\ncodice_bjcp: \"2C\"\ndescrizione: |\n  Dark lager internazionale con Carafa Special II per colore e note tostate senza\n  astringenza, corpo medio e finitura pulita.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-international-dark-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.050\n  fg: 1.012\n  abv_percent: 4.9\n  ibu: 14\n  ebc: 44\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row Nord America\"\n    kg: 2.5\n    percent: 52.4\n    note: \"Malto base\"\n  - malto: \"Pilsner belga\"\n    kg: 0.9\n    percent: 19.0\n    note: \"Malto base\"\n  - malto: \"Mais in fiocchi\"\n    kg: 0.45\n    percent: 9.5\n    note: \"Secchezza\"\n  - malto: \"Riso in fiocchi\"\n    kg: 0.45\n    percent: 9.5\n    note: \"Secchezza\"\n  - malto: \"Weyermann Carafa Special II\"\n    kg: 0.28\n    percent: 6.0\n    note: \"Colore e tostatura\"\n  - malto: \"Dingemans Cara 45\"\n    kg: 0.17\n    percent: 3.6\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Vanguard\"\n    grammi: 23\n    tempo_min: 60\n    uso: boil\n\nlievito:\n  ceppo: \"White Labs WLP833 (German Bock) / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 1\n  note: \"Lagering 2 mesi a 1°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Carafa Special II dehusked per colore senza astringenza\"\n  - \"Lagering lungo per finitura pulita\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare Carafa a 8%\"\n    impatto: \"Note tostate più decise\"\n";

//#endregion
//#region src/brewing/recipes/03-czech-lager/3A-czech-pale-lager.yaml?raw
var _3A_czech_pale_lager_default = "nome: \"Czech Pale Lager\"\nstile: \"Czech Pale Lager\"\ncodice_bjcp: \"3A\"\ndescrizione: |\n  Lager ceco pallido con luppolatura Saaz decisa e corpo leggermente più pieno;\n  mash a decozione per ricchezza maltata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/czech-pale-lager/\"\n  autore: \"Petr Bachan\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.042\n  fg: 1.011\n  abv_percent: 4.1\n  ibu: 29\n  ebc: 7\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German Pilsner malt\"\n    kg: 3.4\n    percent: 87\n    note: \"Malto base\"\n  - malto: \"Caravienne malt (22°L)\"\n    kg: 0.2\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"German wheat malt\"\n    kg: 0.17\n    percent: 4\n    note: \"Corpo\"\n  - malto: \"German acidulated malt\"\n    kg: 0.14\n    percent: 4\n    note: \"pH mash\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 7\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 21\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Magnum\"\n    grammi: 9\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2633 (Oktoberfest Lager Blend)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 69\n  durata_min: 40\n  spessore_l_kg: 3.0\n  note: \"Decozione 30-45 min\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Mash a decozione per ricchezza maltata\"\n  - \"Luppolatura Saaz decisa\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Mash a 66°C\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/03-czech-lager/3B-czech-premium-pale-lager.yaml?raw
var _3B_czech_premium_pale_lager_default = "nome: \"Weldwerks Brewing's Weld Pilsner clone\"\nstile: \"Czech Premium Pale Lager\"\ncodice_bjcp: \"3B\"\ndescrizione: |\n  Czech premium pale lager con luppolatura Saaz decisa (46 IBU, leggermente sopra\n  lo stile). Grist 100% Pilsner per un profilo pulito e croccante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/weldwerks-brewings-weld-pilsner-clone/\"\n  autore: \"BYO Staff\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.051\n  fg: 1.009\n  abv_percent: 5.5\n  ibu: 46\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Gambrinus Pilsner malt\"\n    kg: 4.67\n    percent: 100\n    note: \"Malto base\"\n\nluppolatura:\n  - varieta: \"Hallertau Magnum\"\n    grammi: 14\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 56\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"SafLager W-34/70 / Wyeast 2124 / White Labs WLP830\"\n  forma: secco\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"13°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 64\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Mash-out 76°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 13\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"3 settimane a 13°C, poi 3 giorni a 14°C, lagering a ~0°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Bollitura 90 min per ridurre i DMS\"\n  - \"Luppolatura Saaz decisa\"\n\nalternative:\n  - descrizione: \"Versione più in stile\"\n    cambiamenti: \"Ridurre IBU a 40\"\n    impatto: \"Più bilanciata nello stile\"\n";

//#endregion
//#region src/brewing/recipes/03-czech-lager/3C-czech-amber-lager.yaml?raw
var _3C_czech_amber_lager_default = "nome: \"Czech Amber Lager\"\nstile: \"Czech Amber Lager\"\ncodice_bjcp: \"3C\"\ndescrizione: |\n  Amber lager ceco moderno a bassa gravità, bilanciato verso l'amaro con\n  luppolatura Saaz in tarda bollitura; doppia decozione per ricchezza maltata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/czech-amber-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.045\n  fg: 1.013\n  abv_percent: 4.2\n  ibu: 24\n  ebc: 24\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German/Czech Pilsner malt\"\n    kg: 1.8\n    percent: 43\n    note: \"Malto base\"\n  - malto: \"German Vienna malt\"\n    kg: 1.6\n    percent: 38\n    note: \"Corpo maltato\"\n  - malto: \"German Munich malt (6°L)\"\n    kg: 0.34\n    percent: 8\n    note: \"Corpo maltato\"\n  - malto: \"Weyermann Caramunich II (45°L)\"\n    kg: 0.23\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Weyermann Carared (20°L)\"\n    kg: 0.17\n    percent: 4\n    note: \"Colore rosso\"\n  - malto: \"Weyermann Carafa Special II (430°L)\"\n    kg: 0.06\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Czech Saaz\"\n    grammi: 21\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 21\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP802 (Czech Budejovice) / Wyeast 2278 (Czech Pils)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"9°C\"\n  note: \"Lievito lager ceco\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Doppia decozione: 55°C/10, 63°C, 70°C, mashout 77°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 9\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Doppia decozione per ricchezza maltata\"\n  - \"Luppolatura Saaz in tarda bollitura\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Munich\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/03-czech-lager/3D-czech-dark-lager.yaml?raw
var _3D_czech_dark_lager_default = "nome: \"Czech Dark Lager\"\nstile: \"Czech Dark Lager\"\ncodice_bjcp: \"3D\"\ndescrizione: |\n  Dark lager ceco con malti scuri decorticati per colore senza astringenza;\n  luppolatura Saaz e lunga lagering.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/czech-dark-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.014\n  abv_percent: 5.0\n  ibu: 30\n  ebc: 53\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Czech Pilsner malt\"\n    kg: 2.6\n    percent: 51\n    note: \"Malto base\"\n  - malto: \"Czech Munich-type malt\"\n    kg: 1.5\n    percent: 30\n    note: \"Corpo maltato\"\n  - malto: \"Czech crystal malt (60-70°L)\"\n    kg: 0.75\n    percent: 15\n    note: \"Caramello\"\n  - malto: \"Czech debittered black malt\"\n    kg: 0.23\n    percent: 4\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP802 / Wyeast 2000-PC (Budvar) / Mangrove Jack's M84\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager ceco\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Doppia decozione: 37°C/10, 53°C/15, 63°C, 73°C, mashout 77°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lunga lagering\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Malti scuri decorticati per colore senza astringenza\"\n  - \"Lunga lagering\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare black malt\"\n    impatto: \"Tostatura più decisa\"\n";

//#endregion
//#region src/brewing/recipes/04-pale-malty-european/4A-munich-helles.yaml?raw
var _4A_munich_helles_default = "nome: \"Munich Helles\"\nstile: \"Munich Helles\"\ncodice_bjcp: \"4A\"\ndescrizione: |\n  Helles equilibrata e maltata con luppoli nobili tedeschi. Mash multi-step per\n  un corpo morbido e pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/munich-helles/\"\n  autore: \"Horst D. Dornbusch\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.047\n  fg: 1.011\n  abv_percent: 4.8\n  ibu: 20\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 4.0\n    percent: 89.9\n    note: \"Malto base\"\n  - malto: \"Weyermann Carahell\"\n    kg: 0.15\n    percent: 3.4\n    note: \"Corpo\"\n  - malto: \"Carapils/Carafoam\"\n    kg: 0.15\n    percent: 3.4\n    note: \"Schiuma e corpo\"\n  - malto: \"Acidulated malt\"\n    kg: 0.15\n    percent: 3.4\n    note: \"pH mash\"\n\nluppolatura:\n  - varieta: \"Tradition\"\n    grammi: 24\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Mittelfrüh\"\n    grammi: 9\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Mittelfrüh\"\n    grammi: 6\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP860 / Wyeast 2352 / Mangrove Jack's M76\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager, diacetyl rest 19°C\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 40°C/15, 50°C/15, 65°C/30, 72°C/30, mash-out 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0-3.5°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Mash multi-step per corpo morbido\"\n  - \"Diacetyl rest a 19°C\"\n\nalternative:\n  - descrizione: \"Versione più semplice\"\n    cambiamenti: \"Single infusion a 65°C\"\n    impatto: \"Corpo leggermente diverso\"\n";

//#endregion
//#region src/brewing/recipes/04-pale-malty-european/4B-festbier.yaml?raw
var _4B_festbier_default = "nome: \"Festbier Is the Best Bier\"\nstile: \"Festbier\"\ncodice_bjcp: \"4B\"\ndescrizione: |\n  Festbier tradizionale da bere al litro durante l'Oktoberfest. Grist 50/50\n  Pilsner-Munich per un profilo maltato ma asciutto.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/festbier-is-the-best-bier/\"\n  autore: \"Franz D. Hofer\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.057\n  fg: 1.012\n  abv_percent: 5.9\n  ibu: 28\n  ebc: 14\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.72\n    percent: 50\n    note: \"Malto base\"\n  - malto: \"German Munich I malt\"\n    kg: 2.72\n    percent: 50\n    note: \"Corpo maltato\"\n\nluppolatura:\n  - varieta: \"Perle\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer Tradition\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP830 / Wyeast 2124 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"9°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 60-62°C/30 (beta), 70-72°C/30 (alpha)\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 9\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0°C per 4 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Grist 50/50 Pilsner-Munich\"\n  - \"Mash step per corpo maltato ma asciutto\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Munich a 60%\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/04-pale-malty-european/4C-helles-bock.yaml?raw
var _4C_helles_bock_default = "nome: \"20/30 Vision Helles Bock\"\nstile: \"Helles Bock\"\ncodice_bjcp: \"4C\"\ndescrizione: |\n  Helles bock dorato che mostra come pochi malti speciali chiari (20-30°L)\n  possano dare complessità maltata a una lager forte e pulita.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/20-30-vision-helles-bock/\"\n  autore: \"Aaron Hyde\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.068\n  fg: 1.017\n  abv_percent: 6.8\n  ibu: 29\n  ebc: 18\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 5.9\n    percent: 93\n    note: \"Malto base\"\n  - malto: \"Weyermann CaraRed\"\n    kg: 0.11\n    percent: 2\n    note: \"Colore\"\n  - malto: \"Biscuit malt\"\n    kg: 0.11\n    percent: 2\n    note: \"Tostatura\"\n  - malto: \"Weyermann CaraAmber\"\n    kg: 0.11\n    percent: 2\n    note: \"Caramello\"\n  - malto: \"Dark Munich malt (30°L)\"\n    kg: 0.11\n    percent: 2\n    note: \"Corpo maltato\"\n\nluppolatura:\n  - varieta: \"Hallertauer Mittelfrüh\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer Mittelfrüh\"\n    grammi: 28\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP833 (German Bock) / Wyeast 2206 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"13°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 13\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Malti speciali chiari per complessità\"\n  - \"Pitch rate elevato per alta gravità\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Munich\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/05-pale-bitter-european/5A-german-leichtbier.yaml?raw
var _5A_german_leichtbier_default = "nome: \"Gordon Strong's Leichtbier\"\nstile: \"German Leichtbier\"\ncodice_bjcp: \"5A\"\ndescrizione: |\n  Leichtbier a bassa gradazione ma pieno di sapore, con luppolatura Hallertauer\n  e corpo sostenuto da Carahell.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-leichtbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.032\n  fg: 1.008\n  abv_percent: 3.1\n  ibu: 23\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.7\n    percent: 92\n    note: \"Malto base\"\n  - malto: \"Carahell malt\"\n    kg: 0.23\n    percent: 8\n    note: \"Corpo\"\n\nluppolatura:\n  - varieta: \"German Hallertauer\"\n    grammi: 35\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"German Hallertauer\"\n    grammi: 21\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP833 / Wyeast 2633 / SafLager S-23\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 75\n  spessore_l_kg: 3.0\n  note: \"Step: 63°C/60, 71°C/15, mashout 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Bassa gradazione ma pieno di sapore\"\n  - \"Carahell per corpo\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Ridurre Carahell\"\n    impatto: \"Corpo più leggero\"\n";

//#endregion
//#region src/brewing/recipes/05-pale-bitter-european/5B-kolsch.yaml?raw
var _5B_kolsch_default = "nome: \"Kölsch I\"\nstile: \"Kölsch\"\ncodice_bjcp: \"5B\"\ndescrizione: |\n  Kölsch autentica con grist quasi interamente Pilsner e un tocco di Vienna.\n  Bollitura 90 min per ridurre i DMS.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/kolsch/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.048\n  fg: 1.009\n  abv_percent: 5.1\n  ibu: 25\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Continental Pilsner malt\"\n    kg: 4.2\n    percent: 94.8\n    note: \"Malto base\"\n  - malto: \"Weyermann Vienna malt\"\n    kg: 0.23\n    percent: 5.2\n    note: \"Corpo maltato\"\n\nluppolatura:\n  - varieta: \"Hallertau\"\n    grammi: 35\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP029 / Wyeast 2565\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"16°C\"\n  note: \"Lievito Kölsch\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, mash-out 76°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 4\n  cold_crash_temp_c: 1\n  note: \"Lagering 4 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Bollitura 90 min per ridurre i DMS\"\n  - \"Lievito Kölsch specifico\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Vienna a 10%\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/05-pale-bitter-european/5C-german-helles-exportbier.yaml?raw
var _5C_german_helles_exportbier_default = "nome: \"Gordon Strong's German Helles Exportbier\"\nstile: \"German Helles Exportbier\"\ncodice_bjcp: \"5C\"\ndescrizione: |\n  Exportbier tedesco più corposo e maltato di una helles, con luppolatura nobile\n  Tettnanger/Spalt e lunga lagering.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-german-helles-exportbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.011\n  abv_percent: 5.5\n  ibu: 27\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 4.3\n    percent: 88\n    note: \"Malto base\"\n  - malto: \"Vienna malt\"\n    kg: 0.34\n    percent: 7\n    note: \"Corpo maltato\"\n  - malto: \"Munich malt\"\n    kg: 0.17\n    percent: 3\n    note: \"Corpo maltato\"\n  - malto: \"Caramunich III (55°L)\"\n    kg: 0.09\n    percent: 2\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Tettnanger\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Tettnanger\"\n    grammi: 28\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Spalt\"\n    grammi: 28\n    tempo_min: 2\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2042 (Danish) / White Labs WLP830 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"11°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 11\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lunga lagering\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Più corposo di una helles\"\n  - \"Luppoli nobili Tettnanger/Spalt\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.048\"\n    impatto: \"Meno corposa\"\n";

//#endregion
//#region src/brewing/recipes/05-pale-bitter-european/5D-german-pils.yaml?raw
var _5D_german_pils_default = "nome: \"German Pils (Pils)\"\nstile: \"German Pils\"\ncodice_bjcp: \"5D\"\ndescrizione: |\n  Pils tedesca piccante e amara (45 IBU) con luppoli nobili. Corpo solido e\n  finale croccante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/german-pils/\"\n  autore: \"Horst D. Dornbusch\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.048\n  fg: 1.011\n  abv_percent: 4.9\n  ibu: 45\n  ebc: 7\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 4.0\n    percent: 90.1\n    note: \"Malto base\"\n  - malto: \"Carapils/Carafoam\"\n    kg: 0.44\n    percent: 9.9\n    note: \"Schiuma e corpo\"\n\nluppolatura:\n  - varieta: \"Tettnanger\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Spalt\"\n    grammi: 36\n    tempo_min: 30\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Mittelfrüh\"\n    grammi: 18\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2247 / White Labs WLP830 / Saflager S-189\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager, diacetyl rest 19°C\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 40°C/15, 50°C/15, 65°C/30, 72°C/30, mash-out 76°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0-3.5°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Bollitura 90 min per ridurre i DMS\"\n  - \"Luppoli nobili per amarezza piccante\"\n\nalternative:\n  - descrizione: \"Versione meno amara\"\n    cambiamenti: \"Ridurre IBU a 35\"\n    impatto: \"Più bilanciata\"\n";

//#endregion
//#region src/brewing/recipes/06-amber-malty-european/6A-marzen.yaml?raw
var _6A_marzen_default = "nome: \"Gordon Strong's Märzen\"\nstile: \"Märzen\"\ncodice_bjcp: \"6A\"\ndescrizione: |\n  Märzen da competizione, più corposa e maltata delle versioni moderne. Grist\n  Vienna/Pilsner/Munich con melanoidin per profondità.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-marzen/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.060\n  fg: 1.014\n  abv_percent: 6.1\n  ibu: 22\n  ebc: 22\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German Vienna malt\"\n    kg: 2.04\n    percent: 35.3\n    note: \"Malto base\"\n  - malto: \"German Pilsner malt\"\n    kg: 1.36\n    percent: 23.5\n    note: \"Malto base\"\n  - malto: \"German Munich malt\"\n    kg: 1.36\n    percent: 23.5\n    note: \"Corpo maltato\"\n  - malto: \"German dark Munich malt\"\n    kg: 0.45\n    percent: 7.8\n    note: \"Profondità\"\n  - malto: \"Melanoidin malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Profondità maltata\"\n  - malto: \"Aromatic malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Aroma maltato\"\n  - malto: \"Weyermann Cara-Munich III\"\n    kg: 0.11\n    percent: 2.0\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"German Tradition\"\n    grammi: 19\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"German Hallertauer\"\n    grammi: 28\n    tempo_min: 20\n    uso: boil\n    note: \"Sapore\"\n\nlievito:\n  ceppo: \"White Labs WLP833 / Omega OYL-111 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, mash-out 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0°C per 8-12 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Melanoidin per profondità maltata\"\n  - \"Lagering lungo per finitura pulita\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.056\"\n    impatto: \"Meno corposa\"\n";

//#endregion
//#region src/brewing/recipes/06-amber-malty-european/6B-rauchbier.yaml?raw
var _6B_rauchbier_default = "nome: \"Rauchbier\"\nstile: \"Rauchbier\"\ncodice_bjcp: \"6B\"\ndescrizione: |\n  Rauchbier di Bamberga con rauchmalz dominante e luppoli nobili. Affumicatura\n  bilanciata da malti Munich e caramello.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/rauchbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.013\n  abv_percent: 5.3\n  ibu: 21\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German smoked malt (rauchmalz)\"\n    kg: 2.72\n    percent: 54.0\n    note: \"Affumicato\"\n  - malto: \"Munich malt\"\n    kg: 1.36\n    percent: 27.0\n    note: \"Corpo maltato\"\n  - malto: \"Dark Munich malt\"\n    kg: 0.45\n    percent: 9.0\n    note: \"Profondità\"\n  - malto: \"Aromatic malt\"\n    kg: 0.23\n    percent: 4.5\n    note: \"Aroma maltato\"\n  - malto: \"Caramunich III\"\n    kg: 0.23\n    percent: 4.5\n    note: \"Caramello\"\n  - malto: \"Carafa Special III\"\n    kg: 0.06\n    percent: 1.1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Hallertauer\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP830 / Wyeast 2124 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 55°C/10, 63°C/40, 70°C/20, 76°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0°C per 6 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Rauchmalz dominante bilanciato da Munich\"\n  - \"Luppoli nobili per non coprire l'affumicato\"\n\nalternative:\n  - descrizione: \"Versione più affumicata\"\n    cambiamenti: \"Aumentare rauchmalz a 70%\"\n    impatto: \"Affumicatura più intensa\"\n";

//#endregion
//#region src/brewing/recipes/06-amber-malty-european/6C-dunkels-bock.yaml?raw
var _6C_dunkels_bock_default = "nome: \"Traditional Bock\"\nstile: \"Dunkels Bock\"\ncodice_bjcp: \"6C\"\ndescrizione: |\n  Bock scuro tradizionale dominato da Munich malt (60%) per ricchezza maltata,\n  con bassa luppolatura e bilanciamento verso il dolce.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/traditional-bock-beer-style-profile/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.070\n  fg: 1.018\n  abv_percent: 7.0\n  ibu: 23\n  ebc: 33\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Continental Pilsner malt (2°L)\"\n    kg: 2.0\n    percent: 30\n    note: \"Malto base\"\n  - malto: \"Munich malt (8°L)\"\n    kg: 4.0\n    percent: 60\n    note: \"Malto dominante\"\n  - malto: \"Weyermann Caramunich III (57°L)\"\n    kg: 0.4\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Melanoidin malt (28°L)\"\n    kg: 0.25\n    percent: 4\n    note: \"Profondità maltata\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 11\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP833 (German Bock) / Wyeast 2206 (Bavarian)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Munich 60% per ricchezza maltata\"\n  - \"Bilanciamento verso il dolce\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare IBU a 28\"\n    impatto: \"Più bilanciata\"\n";

//#endregion
//#region src/brewing/recipes/07-amber-bitter-european/7A-vienna-lager.yaml?raw
var _7A_vienna_lager_default = "nome: \"Gordon Strong's Vienna Lager\"\nstile: \"Vienna Lager\"\ncodice_bjcp: \"7A\"\ndescrizione: |\n  Vienna lager elegante e maltata, senza spigoli. Amaro moderato per bilanciare\n  il malto.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-vienna-lager/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.051\n  fg: 1.012\n  abv_percent: 5.2\n  ibu: 19\n  ebc: 24\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Vienna malt\"\n    kg: 1.81\n    percent: 37.0\n    note: \"Malto base\"\n  - malto: \"Pilsner malt\"\n    kg: 1.59\n    percent: 32.4\n    note: \"Malto base\"\n  - malto: \"Dark Munich malt\"\n    kg: 0.79\n    percent: 16.1\n    note: \"Profondità\"\n  - malto: \"Caravienne malt\"\n    kg: 0.68\n    percent: 13.9\n    note: \"Caramello\"\n  - malto: \"Carafa Special III\"\n    kg: 0.03\n    percent: 0.6\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Styrian Golding\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2124 / White Labs WLP830 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 55°C/10, 63°C/40, 70°C/20, 76°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0°C per 2 mesi\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Vienna come malto dominante\"\n  - \"Lagering lungo per eleganza\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare dark Munich\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/07-amber-bitter-european/7B-altbier.yaml?raw
var _7B_altbier_default = "nome: \"Gordon Strong's Altbier\"\nstile: \"Altbier\"\ncodice_bjcp: \"7B\"\ndescrizione: |\n  Altbier di Düsseldorf con decozione, amaro deciso (51 IBU) e luppolatura nobile;\n  fermentato a temperatura ale poi lagering.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-altbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.051\n  fg: 1.012\n  abv_percent: 5.1\n  ibu: 51\n  ebc: 30\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.7\n    percent: 57\n    note: \"Malto base\"\n  - malto: \"Munich malt\"\n    kg: 1.6\n    percent: 34\n    note: \"Corpo maltato\"\n  - malto: \"Wheat malt\"\n    kg: 0.23\n    percent: 5\n    note: \"Corpo\"\n  - malto: \"Caramunich II\"\n    kg: 0.14\n    percent: 3\n    note: \"Caramello\"\n  - malto: \"Carafa Special III\"\n    kg: 0.09\n    percent: 2\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Perle\"\n    grammi: 35\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Spalt\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Spalt\"\n    grammi: 14\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP036 (Düsseldorf Alt) / Wyeast 1007 / Safale K-97\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"16°C\"\n  note: \"Lievito alt, 3 giorni a 16°C poi 20°C\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 65\n  spessore_l_kg: 3.0\n  note: \"Decozione: 62°C/20, 68°C/45, mashout 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Lagering dopo fermentazione ale\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Amaro deciso (51 IBU)\"\n  - \"Decozione per ricchezza maltata\"\n\nalternative:\n  - descrizione: \"Versione meno amara\"\n    cambiamenti: \"Ridurre IBU a 40\"\n    impatto: \"Più bilanciata\"\n";

//#endregion
//#region src/brewing/recipes/07-amber-bitter-european/7C-kellerbier.yaml?raw
var _7C_kellerbier_default = "nome: \"Kellerbier\"\nstile: \"Kellerbier\"\ncodice_bjcp: \"7C\"\ndescrizione: |\n  Kellerbier francone non filtrato, maltato e paneoso, con luppolatura Perle\n  pulita e carbonazione morbida.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/kellerbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.051\n  fg: 1.013\n  abv_percent: 5.0\n  ibu: 18\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German Pilsner malt\"\n    kg: 3.5\n    percent: 73\n    note: \"Malto base\"\n  - malto: \"German Vienna malt\"\n    kg: 0.54\n    percent: 11\n    note: \"Corpo maltato\"\n  - malto: \"Bestmalz caramel Pils malt (2°L)\"\n    kg: 0.54\n    percent: 11\n    note: \"Corpo\"\n  - malto: \"Biscuit malt\"\n    kg: 0.2\n    percent: 4\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Perle\"\n    grammi: 6\n    tempo_min: 0\n    uso: first_wort\n    note: \"Amaro\"\n  - varieta: \"Perle\"\n    grammi: 11\n    tempo_min: 80\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 11\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"SafLager W-34/70 / Wyeast 2124 / White Labs WLP830\"\n  forma: secco\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"9°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 70\n  spessore_l_kg: 3.0\n  note: \"Step: 52°C/10, 63°C/40, 72°C/20, mashout 78°C\"\n\nbollitura:\n  durata_min: 80\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 9\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Non filtrato, carbonazione morbida\"\n  - \"Profilo maltato e paneoso\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aumentare IBU a 25\"\n    impatto: \"Più amara\"\n";

//#endregion
//#region src/brewing/recipes/08-dark-european-lager/8A-munich-dunkel.yaml?raw
var _8A_munich_dunkel_default = "nome: \"Munich Dunkel\"\nstile: \"Munich Dunkel\"\ncodice_bjcp: \"8A\"\ndescrizione: |\n  Dunkel maltata e tostata con base Pilsner e note di crystal/chocolate. Lagering\n  lungo per un profilo pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/munich-dunkel-2/\"\n  autore: \"Keith Yager\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.013\n  abv_percent: 5.3\n  ibu: 23\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German Pilsner malt\"\n    kg: 4.31\n    percent: 84.5\n    note: \"Malto base\"\n  - malto: \"German crystal malt (40°L)\"\n    kg: 0.45\n    percent: 8.8\n    note: \"Caramello\"\n  - malto: \"Caramel Vienne malt\"\n    kg: 0.23\n    percent: 4.5\n    note: \"Caramello\"\n  - malto: \"Chocolate malt\"\n    kg: 0.11\n    percent: 2.2\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Hallertau Mittelfrüh\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertau Mittelfrüh\"\n    grammi: 14\n    tempo_min: 20\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Saaz\"\n    grammi: 7\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2206 / Wyeast 2308 / White Labs WLP920 / Mangrove Jack's M76\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"13°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 75\n  spessore_l_kg: 3.0\n  note: \"Step: 50°C/30, 69°C/45, mash-out 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 13\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 60 giorni\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Lagering lungo per profilo pulito\"\n  - \"Chocolate solo per tostatura leggera\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare chocolate malt\"\n    impatto: \"Note tostate più decise\"\n";

//#endregion
//#region src/brewing/recipes/08-dark-european-lager/8B-schwarzbier.yaml?raw
var _8B_schwarzbier_default = "nome: \"Gordon Strong's Schwarzbier\"\nstile: \"Schwarzbier\"\ncodice_bjcp: \"8B\"\ndescrizione: |\n  Schwarzbier scura ma pulita, con Carafa dehusked per colore senza astringenza.\n  Amaro moderato (30 IBU).\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-schwarzbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.048\n  fg: 1.012\n  abv_percent: 4.7\n  ibu: 30\n  ebc: 62\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.72\n    percent: 60.0\n    note: \"Malto base\"\n  - malto: \"Dark Munich malt\"\n    kg: 1.36\n    percent: 30.0\n    note: \"Corpo maltato\"\n  - malto: \"Weyermann Carafa Special I\"\n    kg: 0.34\n    percent: 7.5\n    note: \"Colore e tostatura\"\n  - malto: \"Weyermann Carafa Special III\"\n    kg: 0.11\n    percent: 2.5\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Magnum\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2124 / White Labs WLP830 / SafLager W-34/70\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager pulito\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 62°C/60, 70°C/15, 76°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 0°C per 3 mesi\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Carafa dehusked per colore senza astringenza\"\n  - \"Lagering lungo per pulizia\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare Carafa I\"\n    impatto: \"Tostatura più decisa\"\n";

//#endregion
//#region src/brewing/recipes/09-strong-european/9A-doppelbock.yaml?raw
var _9A_doppelbock_default = "nome: \"Doppelbockinator\"\nstile: \"Doppelbock\"\ncodice_bjcp: \"9A\"\ndescrizione: |\n  Doppelbock potente (9.7% ABV) dominata dal malto Munich. Richiede pitch rate\n  elevato (starter ~7.6 L).\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/doppelbockinator/\"\n  autore: \"Aaron Hyde\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.091\n  fg: 1.023\n  abv_percent: 9.7\n  ibu: 24\n  ebc: 36\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Munich malt\"\n    kg: 5.9\n    percent: 64.8\n    note: \"Malto dominante\"\n  - malto: \"Continental Pilsner malt\"\n    kg: 1.45\n    percent: 15.9\n    note: \"Malto base\"\n  - malto: \"Goldpils Vienna malt\"\n    kg: 1.45\n    percent: 15.9\n    note: \"Corpo maltato\"\n  - malto: \"Caramel Munich malt\"\n    kg: 0.26\n    percent: 2.8\n    note: \"Caramello\"\n  - malto: \"Blackprinz malt\"\n    kg: 0.06\n    percent: 0.6\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Hallertauer Hersbrucker\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer Hersbrucker\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP833 / Wyeast 2206\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"13°C\"\n  note: \"Lievito lager, pitch rate elevato (starter ~7.6L)\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 13\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Lagering 9°C per 6 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Pitch rate elevato per alta gravità\"\n  - \"Munich dominante per corpo maltato\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.080\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/09-strong-european/9B-eisbock.yaml?raw
var _9B_eisbock_default = "nome: \"Gordon Strong's Eisbock\"\nstile: \"Eisbock\"\ncodice_bjcp: \"9B\"\ndescrizione: |\n  Eisbock ottenuto per concentrazione a freddo (freeze concentration): si\n  trasferiscono ~15 L lasciando ~3.8 L di ghiaccio, aumentando corpo e alcol.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-eisbock/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.081\n  fg: 1.017\n  abv_percent: 8.4\n  ibu: 21\n  ebc: 39\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.3\n    percent: 28\n    note: \"Malto base\"\n  - malto: \"Dark Munich malt\"\n    kg: 2.3\n    percent: 28\n    note: \"Corpo maltato\"\n  - malto: \"Munich malt\"\n    kg: 2.0\n    percent: 24\n    note: \"Corpo maltato\"\n  - malto: \"Carapils\"\n    kg: 0.45\n    percent: 6\n    note: \"Schiuma e corpo\"\n  - malto: \"CaraMunich III\"\n    kg: 0.45\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Caravienne\"\n    kg: 0.45\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Crystal malt (80°L)\"\n    kg: 0.23\n    percent: 3\n    note: \"Caramello scuro\"\n\nluppolatura:\n  - varieta: \"Crystal\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Tettnang\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 2206 (Bavarian) / White Labs WLP940 (Mexican)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, mashout 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 0\n  note: \"Freeze concentration: trasferire ~15L lasciando ~3.8L di ghiaccio\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Concentrazione a freddo per aumentare corpo e alcol\"\n  - \"Pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno concentrata\"\n    cambiamenti: \"Ridurre il tempo di freeze\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/09-strong-european/9C-baltic-porter.yaml?raw
var _9C_baltic_porter_default = "nome: \"Gordon Strong's Baltic Porter\"\nstile: \"Baltic Porter\"\ncodice_bjcp: \"9C\"\ndescrizione: |\n  Baltic porter ricca e complessa (7.8% ABV) con grist stratificato. Versione\n  usata da Strong per vincere un oro NHC.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-baltic-porter/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Versione usata per vincere un oro NHC (dichiarato dalla fonte).\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.083\n  fg: 1.024\n  abv_percent: 7.8\n  ibu: 30\n  ebc: 108\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter pale ale malt\"\n    kg: 3.18\n    percent: 39.8\n    note: \"Malto base\"\n  - malto: \"German dark Munich malt\"\n    kg: 1.59\n    percent: 19.9\n    note: \"Corpo maltato\"\n  - malto: \"Weyermann CaraMunich II\"\n    kg: 0.79\n    percent: 9.9\n    note: \"Caramello\"\n  - malto: \"UK brown malt\"\n    kg: 0.68\n    percent: 8.5\n    note: \"Tostatura\"\n  - malto: \"UK crystal (90°L)\"\n    kg: 0.57\n    percent: 7.1\n    note: \"Caramello scuro\"\n  - malto: \"German wheat malt\"\n    kg: 0.45\n    percent: 5.6\n    note: \"Corpo\"\n  - malto: \"UK chocolate malt\"\n    kg: 0.34\n    percent: 4.3\n    note: \"Tostatura\"\n  - malto: \"Belgian Special B\"\n    kg: 0.23\n    percent: 2.9\n    note: \"Frutta secca\"\n  - malto: \"Weyermann Carafa Special III\"\n    kg: 0.17\n    percent: 2.1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Fuggles\"\n    grammi: 57\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 2\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Ceppo lager pulito (es. WLP833 / W-34/70)\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"17°C\"\n  note: \"Fermentazione a 17°C, lagering 1°C per 12 settimane\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, mash-out 77°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 1\n  note: \"Lagering 1°C per 12 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Grist stratificato per complessità\"\n  - \"Lagering lungo per finitura pulita\"\n\nalternative:\n  - descrizione: \"Versione più semplice\"\n    cambiamenti: \"Ridurre i malti speciali\"\n    impatto: \"Meno complessa\"\n";

//#endregion
//#region src/brewing/recipes/10-german-wheat/10A-weissbier.yaml?raw
var _10A_weissbier_default = "nome: \"Harold-is-Weizen (German Hefeweizen)\"\nstile: \"Weissbier (Hefeweizen)\"\ncodice_bjcp: \"10A\"\ndescrizione: |\n  Hefeweizen classico bavarese con 50% frumento, luppolatura minima e lievito\n  weizen per i tipici esteri di banana e chiodi di garofano.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/german-hefeweizen/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.012\n  abv_percent: 4.8\n  ibu: 13\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Malto di frumento (wheat malt)\"\n    kg: 2.2\n    percent: 50\n    note: \"Frumento\"\n  - malto: \"Malto Pilsner\"\n    kg: 2.2\n    percent: 50\n    note: \"Malto base\"\n\nluppolatura:\n  - varieta: \"Hallertau\"\n    grammi: 19\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 3068 (Weihenstephan Weizen) / White Labs WLP300 / Lallemand Munich Classic\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"17°C\"\n  note: \"Lievito weizen per esteri di banana e chiodi di garofano\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 43°C/20, poi 67°C; oppure single infusion 66°C/60\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Lievito weizen per esteri caratteristici\"\n  - \"Luppolatura minima\"\n\nalternative:\n  - descrizione: \"Versione più speziata\"\n    cambiamenti: \"Fermentare a 18°C\"\n    impatto: \"Più chiodi di garofano\"\n";

//#endregion
//#region src/brewing/recipes/10-german-wheat/10B-dunkles-weissbier.yaml?raw
var _10B_dunkles_weissbier_default = "nome: \"Dunkelweizen (Jamil Zainasheff)\"\nstile: \"Dunkles Weissbier\"\ncodice_bjcp: \"10B\"\ndescrizione: |\n  Dunkelweizen classico con 62% frumento, luppolatura minima e lievito weizen\n  per esteri di banana e chiodi di garofano.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/dunkelweizen/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.050\n  fg: 1.012\n  abv_percent: 5.0\n  ibu: 15\n  ebc: 36\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Wheat malt\"\n    kg: 3.0\n    percent: 62\n    note: \"Frumento\"\n  - malto: \"Munich\"\n    kg: 1.5\n    percent: 31\n    note: \"Corpo maltato\"\n  - malto: \"Caramel Munich 60L\"\n    kg: 0.25\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Carafa Special II\"\n    kg: 0.075\n    percent: 2\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Hallertau\"\n    grammi: 21\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 3068 / White Labs WLP300 / Lallemand Munich Classic\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"17°C\"\n  note: \"Lievito weizen\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Lievito weizen per esteri caratteristici\"\n  - \"Munich per corpo maltato\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre Carafa\"\n    impatto: \"Colore più chiaro\"\n";

//#endregion
//#region src/brewing/recipes/10-german-wheat/10C-weizenbock.yaml?raw
var _10C_weizenbock_default = "nome: \"Gordon Strong's Weizenbock\"\nstile: \"Weizenbock\"\ncodice_bjcp: \"10C\"\ndescrizione: |\n  Weizenbock ricco e maltato con oltre metà frumento, decoction mash e carattere\n  speziato/fruttato da lievito weizen.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-weizenbock/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.079\n  fg: 1.020\n  abv_percent: 7.9\n  ibu: 17\n  ebc: 39\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Wheat malt\"\n    kg: 3.2\n    percent: 43\n    note: \"Frumento\"\n  - malto: \"Vienna\"\n    kg: 2.3\n    percent: 31\n    note: \"Corpo maltato\"\n  - malto: \"Dark wheat\"\n    kg: 0.68\n    percent: 9\n    note: \"Colore\"\n  - malto: \"Caramel wheat\"\n    kg: 0.68\n    percent: 9\n    note: \"Caramello\"\n  - malto: \"Aromatic\"\n    kg: 0.454\n    percent: 6\n    note: \"Aroma maltato\"\n  - malto: \"Chocolate wheat\"\n    kg: 0.113\n    percent: 2\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Perle\"\n    grammi: 21\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP380 / Wyeast 3638 / LalBrew Munich Classic / Mangrove Jack's M20\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"17°C\"\n  note: \"Lievito weizen\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 45\n  spessore_l_kg: 3.0\n  note: \"Decozione: 55°C/15, 62°C/15, 70°C/15, mashout 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Decoction mash per ricchezza maltata\"\n  - \"Alta gravità, pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.070\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/11-british-bitter/11A-ordinary-bitter.yaml?raw
var _11A_ordinary_bitter_default = "nome: \"Ordinary Bitter (Jamil Zainasheff)\"\nstile: \"Ordinary Bitter\"\ncodice_bjcp: \"11A\"\ndescrizione: |\n  Bitter inglese da cask, bassa gradazione e carbonazione, con luppolo EKG e\n  lievito inglese pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/ordinary-bitter-2/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.038\n  fg: 1.011\n  abv_percent: 3.5\n  ibu: 30\n  ebc: 22\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"English pale ale malt\"\n    kg: 3.2\n    percent: 90\n    note: \"Malto base\"\n  - malto: \"Crystal 120L\"\n    kg: 0.23\n    percent: 6.5\n    note: \"Caramello\"\n  - malto: \"Special Roast 50L\"\n    kg: 0.113\n    percent: 3\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"EKG\"\n    grammi: 33\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"EKG\"\n    grammi: 14\n    tempo_min: 30\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"EKG\"\n    grammi: 14\n    tempo_min: 1\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP002 / Wyeast 1968 / Lallemand London ESB\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.2\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Bassa gradazione e carbonazione (cask)\"\n  - \"Luppolo EKG\"\n\nalternative:\n  - descrizione: \"Versione più corposa\"\n    cambiamenti: \"Mash a 69°C\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/11-british-bitter/11B-best-bitter.yaml?raw
var _11B_best_bitter_default = "nome: \"Copper Clad Best Bitter\"\nstile: \"Best Bitter\"\ncodice_bjcp: \"11B\"\ndescrizione: |\n  Best bitter da cask ale inglese, con luppolo moderno Endeavour per un carattere\n  fruttato e rinfrescante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/copper-clad-best-bitter/\"\n  autore: \"Ben Martin\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.040\n  fg: 1.008\n  abv_percent: 4.1\n  ibu: 29\n  ebc: 22\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt britannico\"\n    kg: 3.4\n    percent: 90\n    note: \"Malto base\"\n  - malto: \"Crystal medium (60°L)\"\n    kg: 0.23\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Amber malt (27°L)\"\n    kg: 0.11\n    percent: 3\n    note: \"Tostatura\"\n  - malto: \"Chocolate malt (425°L)\"\n    kg: 0.04\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Challenger\"\n    grammi: 12\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Endeavour\"\n    grammi: 4.3\n    tempo_min: 30\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Endeavour\"\n    grammi: 33\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"SafAle S-04\"\n  forma: secco\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 65.5\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.2\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Carbonazione bassa (cask ale)\"\n  - \"Luppolo Endeavour per carattere fruttato\"\n\nalternative:\n  - descrizione: \"Versione tradizionale\"\n    cambiamenti: \"Sostituire Endeavour con EKG\"\n    impatto: \"Profilo più classico\"\n";

//#endregion
//#region src/brewing/recipes/11-british-bitter/11C-strong-bitter.yaml?raw
var _11C_strong_bitter_default = "nome: \"Gordon Strong's Strong Bitter\"\nstile: \"Strong Bitter (ESB)\"\ncodice_bjcp: \"11C\"\ndescrizione: |\n  ESB corposa e maltata con tecnica no-sparge e luppolatura inglese/continentale\n  bilanciata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-strong-bitter/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.013\n  abv_percent: 5.2\n  ibu: 39\n  ebc: 26\n  efficienza_percent: 75\n  impianto: \"All grain 19L (no-sparge)\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter\"\n    kg: 5.9\n    percent: 89\n    note: \"Malto base\"\n  - malto: \"Crystal (70-80°L)\"\n    kg: 0.34\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Fiocchi di mais\"\n    kg: 0.227\n    percent: 3\n    note: \"Corpo\"\n  - malto: \"Victory\"\n    kg: 0.15\n    percent: 2\n    note: \"Tostatura\"\n  - malto: \"Black patent\"\n    kg: 0.028\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Styrian Golding\"\n    grammi: 28\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Challenger\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Fuggle\"\n    grammi: 28\n    tempo_min: 20\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Styrian Golding\"\n    grammi: 28\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Styrian Golding\"\n    grammi: 28\n    tempo_min: 0\n    uso: whirlpool\n\nlievito:\n  ceppo: \"Wyeast 1968 (London ESB) / WLP002 / LalBrew London ESB\"\n  forma: liquido\n  attenuazione_percent: 72\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ESB inglese\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, no-sparge\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.2\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Tecnica no-sparge per corpo pieno\"\n  - \"Lievito ESB per carattere fruttato\"\n\nalternative:\n  - descrizione: \"Versione più amara\"\n    cambiamenti: \"Aumentare IBU a 45\"\n    impatto: \"Più amara\"\n";

//#endregion
//#region src/brewing/recipes/12-pale-commonwealth/12A-british-golden-ale.yaml?raw
var _12A_british_golden_ale_default = "nome: \"British Golden Ale\"\nstile: \"British Golden Ale\"\ncodice_bjcp: \"12A\"\ndescrizione: |\n  Golden ale sessionabile con Vienna e luppoli tipo ceco per un profilo fruttato\n  e rinfrescante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/british-golden-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.044\n  fg: 1.011\n  abv_percent: 4.3\n  ibu: 34\n  ebc: 12\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 2.3\n    percent: 55\n    note: \"Malto base\"\n  - malto: \"Vienna\"\n    kg: 0.9\n    percent: 22\n    note: \"Corpo maltato\"\n  - malto: \"Fiocchi di mais\"\n    kg: 0.45\n    percent: 11\n    note: \"Corpo\"\n  - malto: \"Frumento torrefatto\"\n    kg: 0.227\n    percent: 5\n    note: \"Schiuma\"\n  - malto: \"Caramel belga (45°L)\"\n    kg: 0.17\n    percent: 4\n    note: \"Caramello\"\n  - malto: \"Carapils\"\n    kg: 0.113\n    percent: 3\n    note: \"Schiuma e corpo\"\n\nluppolatura:\n  - varieta: \"First Gold\"\n    grammi: 21\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Sterling\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Sterling\"\n    grammi: 21\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Sterling\"\n    grammi: 35\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"First Gold\"\n    grammi: 7\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1335 (British Ale II) / WLP022\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 19\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 19\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Dry hop per carattere fruttato\"\n  - \"Vienna per corpo maltato\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare i fiocchi di mais\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/12-pale-commonwealth/12B-australian-sparkling-ale.yaml?raw
var _12B_australian_sparkling_ale_default = "nome: \"Coopers Sparkling Ale clone\"\nstile: \"Australian Sparkling Ale\"\ncodice_bjcp: \"12B\"\ndescrizione: |\n  Clone della Coopers Sparkling Ale, con zucchero di canna e luppolo Pride of\n  Ringwood per il caratteristico profilo australiano.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/coopers-sparkling-ale-clone/\"\n  autore: \"BYO Staff\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.008\n  abv_percent: 5.8\n  ibu: 29\n  ebc: 12\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Joe White pale ale malt\"\n    kg: 4.0\n    percent: 89\n    note: \"Malto base\"\n  - malto: \"White wheat\"\n    kg: 0.45\n    percent: 10\n    note: \"Corpo\"\n  - malto: \"Extra dark crystal 180L\"\n    kg: 0.045\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Pride of Ringwood\"\n    grammi: 21\n    tempo_min: 90\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP009 (Australian Ale) o lievito da bottiglie Coopers\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale australiano\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Zucchero di canna 0.20kg a 90 min\"\n  - \"Luppolo Pride of Ringwood\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare lo zucchero\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/12-pale-commonwealth/12C-english-ipa.yaml?raw
var _12C_english_ipa_default = "nome: \"Gordon Strong's English IPA\"\nstile: \"English IPA\"\ncodice_bjcp: \"12C\"\ndescrizione: |\n  IPA inglese minimale: un solo malto, un solo luppolo (EKG) per un profilo pulito\n  e tradizionale.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-english-ipa/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.061\n  fg: 1.012\n  abv_percent: 6.5\n  ibu: 58\n  ebc: 12\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt britannico\"\n    kg: 5.7\n    percent: 100\n    note: \"Malto base\"\n\nluppolatura:\n  - varieta: \"East Kent Goldings\"\n    grammi: 85\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"East Kent Goldings\"\n    grammi: 57\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1028 (London Ale) / WLP007 / SafAle S-04 / LalBrew Nottingham\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito ale inglese, max 21°C\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 18\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 18\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Un solo malto, un solo luppolo\"\n  - \"Dry hop EKG per aroma tradizionale\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aggiungere dry hop aggiuntivo\"\n    impatto: \"Aroma più intenso\"\n";

//#endregion
//#region src/brewing/recipes/13-brown-british/13A-dark-mild.yaml?raw
var _13A_dark_mild_default = "nome: \"Gordon Strong's Dark Mild Ale\"\nstile: \"Dark Mild\"\ncodice_bjcp: \"13A\"\ndescrizione: |\n  Mild scura a bassa gradazione, maltata e bilanciata, con base Maris Otter e\n  note tostate.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-dark-mild-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.043\n  fg: 1.014\n  abv_percent: 3.8\n  ibu: 17\n  ebc: 43\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter\"\n    kg: 2.7\n    percent: 65\n    note: \"Malto base\"\n  - malto: \"Brown malt UK\"\n    kg: 0.567\n    percent: 14\n    note: \"Tostatura\"\n  - malto: \"Crystal UK (50°L)\"\n    kg: 0.227\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Pale chocolate\"\n    kg: 0.113\n    percent: 3\n    note: \"Tostatura\"\n  - malto: \"Chocolate malt\"\n    kg: 0.085\n    percent: 2\n    note: \"Tostatura\"\n  - malto: \"Fiocchi d'orzo\"\n    kg: 0.227\n    percent: 5\n    note: \"Corpo\"\n  - malto: \"Fiocchi d'avena\"\n    kg: 0.227\n    percent: 5\n    note: \"Corpo\"\n\nluppolatura:\n  - varieta: \"East Kent Golding\"\n    grammi: 21\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1968 / WLP002 / LalBrew London ESB\"\n  forma: liquido\n  attenuazione_percent: 72\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.2\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Bassa gradazione, corpo pieno\"\n  - \"Fiocchi per corpo senza alcol\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre chocolate malt\"\n    impatto: \"Colore più chiaro\"\n";

//#endregion
//#region src/brewing/recipes/13-brown-british/13B-british-brown-ale.yaml?raw
var _13B_british_brown_ale_default = "nome: \"Gordon Strong's British Brown Ale\"\nstile: \"British Brown Ale\"\ncodice_bjcp: \"13B\"\ndescrizione: |\n  Brown ale inglese equilibrata e beverina, con doppio crystal e frumento\n  torrefatto per corpo e carattere.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-british-brown-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.046\n  fg: 1.009\n  abv_percent: 4.9\n  ibu: 21\n  ebc: 35\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter\"\n    kg: 2.3\n    percent: 52\n    note: \"Malto base\"\n  - malto: \"Golden Promise\"\n    kg: 0.907\n    percent: 20\n    note: \"Malto base\"\n  - malto: \"Frumento torrefatto\"\n    kg: 0.454\n    percent: 10\n    note: \"Corpo\"\n  - malto: \"Crystal UK (65°L)\"\n    kg: 0.454\n    percent: 10\n    note: \"Caramello\"\n  - malto: \"Crystal UK (45°L)\"\n    kg: 0.227\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Chocolate malt\"\n    kg: 0.113\n    percent: 3\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Goldings\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Goldings\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Goldings\"\n    grammi: 14\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1318 (London Ale III) / Omega OYL-011 / LalBrew Verdant IPA\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Doppio crystal per carattere caramellato\"\n  - \"Frumento torrefatto per corpo\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare chocolate malt\"\n    impatto: \"Note tostate più decise\"\n";

//#endregion
//#region src/brewing/recipes/13-brown-british/13C-english-porter.yaml?raw
var _13C_english_porter_default = "nome: \"Gordon Strong's English Porter\"\nstile: \"English Porter\"\ncodice_bjcp: \"13C\"\ndescrizione: |\n  Porter inglese con brown malt come componente di sapore e Munich per corpo\n  maltato senza dolcezza residua.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-english-porter/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.015\n  abv_percent: 4.9\n  ibu: 28\n  ebc: 59\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt UK\"\n    kg: 3.2\n    percent: 63\n    note: \"Malto base\"\n  - malto: \"Brown malt UK\"\n    kg: 0.57\n    percent: 11\n    note: \"Tostatura\"\n  - malto: \"Crystal UK (60°L)\"\n    kg: 0.57\n    percent: 11\n    note: \"Caramello\"\n  - malto: \"Munich\"\n    kg: 0.45\n    percent: 9\n    note: \"Corpo maltato\"\n  - malto: \"Chocolate malt UK\"\n    kg: 0.283\n    percent: 6\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Fuggle\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Goldings\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1968 / WLP002 / LalBrew Windsor\"\n  forma: liquido\n  attenuazione_percent: 72\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Brown malt per sapore caratteristico\"\n  - \"Munich per corpo senza dolcezza\"\n\nalternative:\n  - descrizione: \"Versione più scura\"\n    cambiamenti: \"Aumentare chocolate malt\"\n    impatto: \"Tostatura più decisa\"\n";

//#endregion
//#region src/brewing/recipes/14-scottish/14A-scottish-light.yaml?raw
var _14A_scottish_light_default = "nome: \"Scottish 60/- Light\"\nstile: \"Scottish Light\"\ncodice_bjcp: \"14A\"\ndescrizione: |\n  Scottish light da session, molto maltata e poco luppolata, con zucchero\n  invertito per corpo e colore.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/scottish-60-light/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.032\n  fg: 1.012\n  abv_percent: 2.5\n  ibu: 17\n  ebc: 35\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 1.8\n    percent: 65\n    note: \"Malto base\"\n  - malto: \"Flaked maize\"\n    kg: 0.45\n    percent: 16\n    note: \"Corpo\"\n  - malto: \"Invert No.3 / candi scuro\"\n    kg: 0.45\n    percent: 16\n    note: \"Colore e corpo\"\n  - malto: \"Debittered black malt\"\n    kg: 0.085\n    percent: 3\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Fuggle\"\n    grammi: 21\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Golding\"\n    grammi: 7\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP028 / Wyeast 1728 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"15°C\"\n  note: \"Lievito scozzese\"\n\nmash:\n  temperatura_c: 70\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 15\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Molto maltata e poco luppolata\"\n  - \"Zucchero invertito per corpo e colore\"\n\nalternative:\n  - descrizione: \"Versione più corposa\"\n    cambiamenti: \"Mash a 72°C\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/14-scottish/14B-scottish-heavy.yaml?raw
var _14B_scottish_heavy_default = "nome: \"Scottish 70/- Heavy\"\nstile: \"Scottish Heavy\"\ncodice_bjcp: \"14B\"\ndescrizione: |\n  Scottish heavy maltato e morbido, con luppolatura minima e lievito scozzese\n  pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/scottish-70-heavy/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.035\n  fg: 1.012\n  abv_percent: 3.0\n  ibu: 13\n  ebc: 26\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 2.7\n    percent: 89\n    note: \"Malto base\"\n  - malto: \"Flaked barley\"\n    kg: 0.17\n    percent: 6\n    note: \"Corpo\"\n  - malto: \"Caramunich II\"\n    kg: 0.085\n    percent: 3\n    note: \"Caramello\"\n  - malto: \"Pale chocolate\"\n    kg: 0.043\n    percent: 1\n    note: \"Tostatura\"\n  - malto: \"Roasted barley\"\n    kg: 0.043\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Fuggle\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP028 / Wyeast 1728 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"15°C\"\n  note: \"Lievito scozzese\"\n\nmash:\n  temperatura_c: 70\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 15\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Luppolatura minima\"\n  - \"Lievito scozzese pulito\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Caramunich\"\n    impatto: \"Caramello più deciso\"\n";

//#endregion
//#region src/brewing/recipes/14-scottish/14C-scottish-export.yaml?raw
var _14C_scottish_export_default = "nome: \"Gordon Strong's Scottish Export\"\nstile: \"Scottish Export\"\ncodice_bjcp: \"14C\"\ndescrizione: |\n  Scottish export maltato con Golden Promise, luppolatura moderata e lievito\n  scozzese per un profilo pulito e rotondo.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-scottish-export/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.042\n  fg: 1.011\n  abv_percent: 4.1\n  ibu: 22\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 3.5\n    percent: 87\n    note: \"Malto base\"\n  - malto: \"Torrified wheat\"\n    kg: 0.227\n    percent: 6\n    note: \"Corpo\"\n  - malto: \"Dark crystal 60-80L\"\n    kg: 0.227\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Roasted barley\"\n    kg: 0.085\n    percent: 2\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"British Golding\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"British Golding\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1728 / White Labs WLP028 / SafAle S-04\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"15°C\"\n  note: \"Lievito scozzese\"\n\nmash:\n  temperatura_c: 70\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 15\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Golden Promise come base\"\n  - \"Luppolatura moderata\"\n\nalternative:\n  - descrizione: \"Versione più corposa\"\n    cambiamenti: \"Mash a 72°C\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/15-irish/15A-irish-red-ale.yaml?raw
var _15A_irish_red_ale_default = "nome: \"Gordon Strong's Irish Red Ale\"\nstile: \"Irish Red Ale\"\ncodice_bjcp: \"15A\"\ndescrizione: |\n  Irish red equilibrata con base dextrinosa (mild malt), avena per corpo e orzo\n  tostato per il colore ramato.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-irish-red-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.045\n  fg: 1.011\n  abv_percent: 4.4\n  ibu: 22\n  ebc: 28\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Mild malt\"\n    kg: 3.2\n    percent: 74\n    note: \"Malto base dextrinoso\"\n  - malto: \"Fiocchi di mais\"\n    kg: 0.454\n    percent: 10\n    note: \"Corpo\"\n  - malto: \"Crystal (40°L)\"\n    kg: 0.454\n    percent: 10\n    note: \"Caramello\"\n  - malto: \"Fiocchi d'avena\"\n    kg: 0.113\n    percent: 3\n    note: \"Corpo\"\n  - malto: \"Orzo tostato (300°L)\"\n    kg: 0.113\n    percent: 3\n    note: \"Colore ramato\"\n\nluppolatura:\n  - varieta: \"Golding\"\n    grammi: 35\n    tempo_min: 45\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Golding\"\n    grammi: 7\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP004 (Irish Ale) / Wyeast 1084 / SafAle S-04\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale irlandese\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Orzo tostato per colore ramato\"\n  - \"Mild malt per corpo dextrinoso\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre orzo tostato\"\n    impatto: \"Colore più chiaro\"\n";

//#endregion
//#region src/brewing/recipes/15-irish/15B-irish-stout.yaml?raw
var _15B_irish_stout_default = "nome: \"Gordon Strong's Irish Stout\"\nstile: \"Irish Stout (Dry Stout)\"\ncodice_bjcp: \"15B\"\ndescrizione: |\n  Dry stout secca e tostata, più simile a Beamish che a Guinness, con grist\n  complesso e bassa amarezza relativa.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-irish-stout/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.039\n  fg: 1.008\n  abv_percent: 4.1\n  ibu: 38\n  ebc: 79\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt\"\n    kg: 2.5\n    percent: 63\n    note: \"Malto base\"\n  - malto: \"Fiocchi d'orzo\"\n    kg: 0.567\n    percent: 14\n    note: \"Corpo\"\n  - malto: \"Orzo tostato\"\n    kg: 0.454\n    percent: 11\n    note: \"Tostatura\"\n  - malto: \"Chocolate malt\"\n    kg: 0.227\n    percent: 6\n    note: \"Tostatura\"\n  - malto: \"Crystal (80°L)\"\n    kg: 0.113\n    percent: 3\n    note: \"Caramello\"\n  - malto: \"Black malt decorticato\"\n    kg: 0.113\n    percent: 3\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"UK Goldings\"\n    grammi: 50\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"UK Goldings\"\n    grammi: 7\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1028 (London Ale) / WLP013 / SafAle S-04\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 62\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion a bassa temperatura per secchezza\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Mash a 62°C per secchezza\"\n  - \"Orzo tostato per carattere tostato\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Mash a 60°C\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/15-irish/15C-irish-extra-stout.yaml?raw
var _15C_irish_extra_stout_default = "nome: \"Irish Extra Stout (Homebrew Example)\"\nstile: \"Irish Extra Stout\"\ncodice_bjcp: \"15C\"\ndescrizione: |\n  Stout nero ispirato alla O'Hara's Leann Folláin di Carlow Brewing, con un'alta\n  percentuale di chocolate malt (13.7%) al posto di roasted barley per un profilo\n  di tostatura profonda. Corpo medio-pieno dato dal flaked barley.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/irish-extra-stout/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.059\n  fg: 1.014\n  abv_percent: 6.0\n  ibu: 40\n  ebc: 98\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"UK Golden Promise\"\n    kg: 3.63\n    percent: 62.7\n    note: \"Malto base\"\n  - malto: \"Flaked barley\"\n    kg: 0.91\n    percent: 15.7\n    note: \"Corpo\"\n  - malto: \"UK chocolate malt (425°L)\"\n    kg: 0.79\n    percent: 13.7\n    note: \"Tostatura profonda\"\n  - malto: \"Torrified wheat\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Corpo\"\n  - malto: \"UK brown malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"UK Northdown (8% AA)\"\n    grammi: 21\n    tempo_min: 90\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"UK Fuggle (4.5% AA)\"\n    grammi: 28\n    tempo_min: 30\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"UK Fuggle\"\n    grammi: 14\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1084 (Irish Ale) / White Labs WLP004 (Irish Ale)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale irlandese\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"64°C/60, poi 68°C/30, mashout 76°C\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Chocolate malt al posto di roasted barley per tostatura profonda\"\n  - \"Flaked barley per corpo medio-pieno\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Mash a 64°C\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/16-dark-british/16A-sweet-stout.yaml?raw
var _16A_sweet_stout_default = "nome: \"Gordon Strong's Sweet Stout\"\nstile: \"Sweet Stout (Milk Stout)\"\ncodice_bjcp: \"16A\"\ndescrizione: |\n  Sweet stout stile Mackeson, con lattosio per dolcezza e IBU contenuti (~25)\n  per non coprire il carattere dolce.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-sweet-stout/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.054\n  fg: 1.017\n  abv_percent: 4.8\n  ibu: 25\n  ebc: 71\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Mild malt\"\n    kg: 3.2\n    percent: 68\n    note: \"Malto base dextrinoso\"\n  - malto: \"Fiocchi d'avena\"\n    kg: 0.34\n    percent: 7\n    note: \"Corpo\"\n  - malto: \"Fiocchi d'orzo\"\n    kg: 0.227\n    percent: 5\n    note: \"Corpo\"\n  - malto: \"Crystal (60°L)\"\n    kg: 0.34\n    percent: 7\n    note: \"Caramello\"\n  - malto: \"Carafa Special III\"\n    kg: 0.142\n    percent: 3\n    note: \"Colore\"\n  - malto: \"Chocolate malt\"\n    kg: 0.142\n    percent: 3\n    note: \"Tostatura\"\n  - malto: \"Orzo tostato\"\n    kg: 0.283\n    percent: 6\n    note: \"Tostatura\"\n  - malto: \"Black patent\"\n    kg: 0.043\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Golding\"\n    grammi: 35\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1968 / WLP002 / Mangrove Jack's M15\"\n  forma: liquido\n  attenuazione_percent: 70\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Lattosio 340g a 15 min (non fermentabile) per dolcezza\"\n  - \"IBU contenuti per non coprire la dolcezza\"\n\nalternative:\n  - descrizione: \"Versione più dolce\"\n    cambiamenti: \"Aumentare lattosio\"\n    impatto: \"Dolcezza più marcata\"\n";

//#endregion
//#region src/brewing/recipes/16-dark-british/16B-oatmeal-stout.yaml?raw
var _16B_oatmeal_stout_default = "nome: \"Gordon Strong's Oatmeal Stout\"\nstile: \"Oatmeal Stout\"\ncodice_bjcp: \"16B\"\ndescrizione: |\n  Oatmeal stout più corposa delle versioni inglesi, con avena in fiocchi per\n  morbidezza e profilo tostato bilanciato.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-oatmeal-stout/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.063\n  fg: 1.018\n  abv_percent: 6.0\n  ibu: 25\n  ebc: 83\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt\"\n    kg: 4.5\n    percent: 75\n    note: \"Malto base\"\n  - malto: \"Fiocchi d'avena\"\n    kg: 0.567\n    percent: 9\n    note: \"Corpo morbido\"\n  - malto: \"Crystal (80°L)\"\n    kg: 0.34\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Chocolate malt (450°L)\"\n    kg: 0.283\n    percent: 5\n    note: \"Tostatura\"\n  - malto: \"Orzo tostato (550°L)\"\n    kg: 0.227\n    percent: 4\n    note: \"Tostatura\"\n  - malto: \"Crystal (40°L)\"\n    kg: 0.113\n    percent: 2\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"UK Golding\"\n    grammi: 21\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"UK Golding\"\n    grammi: 21\n    tempo_min: 30\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1318 (London Ale III) / Imperial A38 / WLP066 / LalBrew New England\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Avena in fiocchi per morbidezza\"\n  - \"Profilo tostato bilanciato\"\n\nalternative:\n  - descrizione: \"Versione più corposa\"\n    cambiamenti: \"Aumentare avena a 12%\"\n    impatto: \"Corpo più morbido\"\n";

//#endregion
//#region src/brewing/recipes/16-dark-british/16C-tropical-stout.yaml?raw
var _16C_tropical_stout_default = "nome: \"Sailing Away Tropical Stout\"\nstile: \"Tropical Stout\"\ncodice_bjcp: \"16C\"\ndescrizione: |\n  Tropical stout maltato e tostato, con lattosio per dolcezza e luppolatura\n  decisa per bilanciare.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/sailing-away-tropical-stout/\"\n  autore: \"Bob Peak\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.072\n  fg: 1.020\n  abv_percent: 6.8\n  ibu: 54\n  ebc: 69\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"English pale ale\"\n    kg: 4.5\n    percent: 80\n    note: \"Malto base\"\n  - malto: \"Chocolate malt\"\n    kg: 0.34\n    percent: 6\n    note: \"Tostatura\"\n  - malto: \"Wheat\"\n    kg: 0.23\n    percent: 4\n    note: \"Corpo\"\n  - malto: \"Carapils\"\n    kg: 0.23\n    percent: 4\n    note: \"Schiuma e corpo\"\n  - malto: \"Caramel 40L\"\n    kg: 0.23\n    percent: 4\n    note: \"Caramello\"\n  - malto: \"Black patent\"\n    kg: 0.113\n    percent: 2\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Willamette\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Fuggle\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Fuggle\"\n    grammi: 14\n    tempo_min: 30\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Willamette\"\n    grammi: 14\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1968 (London ESB)\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Lattosio 0.113kg per dolcezza\"\n  - \"Dried rice extract 0.45kg per attenuazione\"\n\nalternative:\n  - descrizione: \"Versione più dolce\"\n    cambiamenti: \"Aumentare lattosio\"\n    impatto: \"Dolcezza più marcata\"\n";

//#endregion
//#region src/brewing/recipes/16-dark-british/16D-foreign-extra-stout.yaml?raw
var _16D_foreign_extra_stout_default = "nome: \"Guinness Foreign Extra Stout clone\"\nstile: \"Foreign Extra Stout\"\ncodice_bjcp: \"16D\"\ndescrizione: |\n  Clone della Guinness FES, robusto e tostato con amaro deciso e corpo pieno da\n  fiocchi d'orzo.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/guinness-foreign-extra-stout-clone/\"\n  autore: \"BYO Staff\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.075\n  fg: 1.021\n  abv_percent: 7.5\n  ibu: 40\n  ebc: 79\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt\"\n    kg: 5.7\n    percent: 79\n    note: \"Malto base\"\n  - malto: \"Flaked barley\"\n    kg: 1.0\n    percent: 14\n    note: \"Corpo\"\n  - malto: \"Roasted barley 500L\"\n    kg: 0.5\n    percent: 7\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Challenger\"\n    grammi: 48\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1084 / White Labs WLP004 (Irish Ale)\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale irlandese\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Fiocchi d'orzo per corpo pieno\"\n  - \"Amaro deciso\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Mash a 64°C\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/17-strong-british/17A-british-strong-ale.yaml?raw
var _17A_british_strong_ale_default = "nome: \"Wolf & Workman Strong Ale\"\nstile: \"British Strong Ale\"\ncodice_bjcp: \"17A\"\ndescrizione: |\n  Strong ale maltato e corposo con carattere di luppolo inglese, ispirato alla\n  Fuller's 1845. Grande percentuale di malti crystal per corpo e dolcezza\n  \"zuccherina\".\n\nfonte:\n  nome: \"Craft Beer & Brewing Magazine\"\n  url: \"https://www.beerandbrewing.com/recipe-wolf-and-workman-strong-ale/\"\n  autore: \"Josh Weikert\"\n  verifica: \"Ricetta pubblicata da Craft Beer & Brewing, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.070\n  fg: 1.018\n  abv_percent: 6.9\n  ibu: 46\n  ebc: 30\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter\"\n    kg: 4.54\n    percent: 76.9\n    note: \"Malto base\"\n  - malto: \"British amber\"\n    kg: 0.45\n    percent: 7.7\n    note: \"Tostatura\"\n  - malto: \"British crystal 45L\"\n    kg: 0.23\n    percent: 3.8\n    note: \"Caramello\"\n  - malto: \"British crystal 90L\"\n    kg: 0.23\n    percent: 3.8\n    note: \"Caramello scuro\"\n  - malto: \"Special B\"\n    kg: 0.23\n    percent: 3.8\n    note: \"Frutta secca\"\n  - malto: \"Aromatic\"\n    kg: 0.23\n    percent: 3.8\n    note: \"Aroma maltato\"\n\nluppolatura:\n  - varieta: \"East Kent Goldings\"\n    grammi: 78\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro (41 IBU)\"\n  - varieta: \"East Kent Goldings\"\n    grammi: 28\n    tempo_min: 0\n    uso: whirlpool\n    note: \"Aroma (5 IBU)\"\n\nlievito:\n  ceppo: \"Wyeast 1318 (London Ale III)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"16°C\"\n  note: \"Partenza 16°C, salita a 18°C dopo 5 giorni, poi 21°C fino a fine fermentazione\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Malti crystal per corpo e dolcezza\"\n  - \"Luppolo inglese EKG\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Ridurre i malti crystal\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/17-strong-british/17B-old-ale.yaml?raw
var _17B_old_ale_default = "nome: \"Gordon Strong's Old Ale\"\nstile: \"Old Ale\"\ncodice_bjcp: \"17B\"\ndescrizione: |\n  Old ale forte e maltata con zucchero invertito, da bere giovane o da invecchiare\n  6+ mesi.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-old-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.075\n  fg: 1.015\n  abv_percent: 8.0\n  ibu: 40\n  ebc: 41\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter\"\n    kg: 4.5\n    percent: 78\n    note: \"Malto base\"\n  - malto: \"Dark Munich\"\n    kg: 1.0\n    percent: 17\n    note: \"Corpo maltato\"\n  - malto: \"CaraPils\"\n    kg: 0.227\n    percent: 4\n    note: \"Schiuma e corpo\"\n  - malto: \"Chocolate malt\"\n    kg: 0.057\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Styrian Golding\"\n    grammi: 57\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"First Gold\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1469 (West Yorkshire Ale) / WLP037 / SafAle S-04\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Zucchero invertito (Invert #3 / candi D-90) 907g per attenuazione\"\n  - \"Da bere giovane o invecchiare 6+ mesi\"\n\nalternative:\n  - descrizione: \"Versione più dolce\"\n    cambiamenti: \"Ridurre lo zucchero invertito\"\n    impatto: \"Finale più dolce\"\n";

//#endregion
//#region src/brewing/recipes/17-strong-british/17C-wee-heavy.yaml?raw
var _17C_wee_heavy_default = "nome: \"Gordon Strong's Strong Scotch Ale\"\nstile: \"Wee Heavy (Strong Scotch Ale)\"\ncodice_bjcp: \"17C\"\ndescrizione: |\n  Wee heavy ricco e maltato, quasi interamente Golden Promise, con\n  caramellizzazione in caldaia e lievito scozzese pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-strong-scotch-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.083\n  fg: 1.022\n  abv_percent: 8.1\n  ibu: 24\n  ebc: 35\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 7.8\n    percent: 98\n    note: \"Malto base\"\n  - malto: \"Roasted barley\"\n    kg: 0.142\n    percent: 2\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Golding\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP028 / Wyeast 1728 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"15°C\"\n  note: \"Lievito scozzese\"\n\nmash:\n  temperatura_c: 70\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, riduzione del primo runnings per caramellizzazione\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 15\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 7\n\nnote_critiche:\n  - \"Caramellizzazione in caldaia per dolcezza\"\n  - \"Alta gravità, pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.075\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/17-strong-british/17D-english-barleywine.yaml?raw
var _17D_english_barleywine_default = "nome: \"Gordon Strong's English Barleywine\"\nstile: \"English Barley Wine\"\ncodice_bjcp: \"17D\"\ndescrizione: |\n  Barley wine inglese ricco e maltato, con Golden Promise e doppio crystal, ideale\n  per l'invecchiamento.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-english-barleywine/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.100\n  fg: 1.029\n  abv_percent: 9.5\n  ibu: 45\n  ebc: 35\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise\"\n    kg: 8.2\n    percent: 86\n    note: \"Malto base\"\n  - malto: \"Frumento torrefatto\"\n    kg: 0.68\n    percent: 7\n    note: \"Corpo\"\n  - malto: \"Crystal medium (45°L)\"\n    kg: 0.34\n    percent: 4\n    note: \"Caramello\"\n  - malto: \"Dark crystal (135°L)\"\n    kg: 0.227\n    percent: 2\n    note: \"Caramello scuro\"\n  - malto: \"Pale chocolate (225°L)\"\n    kg: 0.057\n    percent: 1\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Challenger\"\n    grammi: 57\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1968 (London ESB) / WLP002 / SafAle S-04\"\n  forma: liquido\n  attenuazione_percent: 72\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito ale inglese\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 8\n\nnote_critiche:\n  - \"Alta gravità, pitch rate elevato\"\n  - \"Ideale per invecchiamento\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.090\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/18-pale-american/18A-blonde-ale.yaml?raw
var _18A_blonde_ale_default = "nome: \"Blondinebier\"\nstile: \"American Blonde Ale\"\ncodice_bjcp: \"18A\"\ndescrizione: |\n  Blonde ale pulita e facile da bere, con base maltata semplice e un tocco di\n  crystal per una leggera dolcezza. Luppolatura delicata e bilanciata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/american-blonde-ale-style-profile/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.011\n  abv_percent: 5.0\n  ibu: 20\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 4.53\n    percent: 95.2\n    note: \"Malto base\"\n  - malto: \"Crystal 15L\"\n    kg: 0.23\n    percent: 4.8\n    note: \"Dolcezza leggera\"\n\nluppolatura:\n  - varieta: \"Willamette\"\n    grammi: 23\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1056 / White Labs WLP001 / Fermentis US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale americano pulito\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Base maltata semplice\"\n  - \"Luppolatura delicata\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aumentare IBU a 25\"\n    impatto: \"Più amara\"\n";

//#endregion
//#region src/brewing/recipes/18-pale-american/18B-american-pale-ale.yaml?raw
var _18B_american_pale_ale_default = "nome: \"Sierra Nevada Pale Ale clone\"\nstile: \"American Pale Ale\"\ncodice_bjcp: \"18B\"\ndescrizione: |\n  Clone del celebre pale ale di Sierra Nevada, con profilo pulito, corpo medio e\n  luppolatura Cascade aromatica e agrumata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/sierra-nevada-pale-ale-clone/\"\n  autore: \"BYO Staff\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.011\n  abv_percent: 5.6\n  ibu: 37\n  ebc: 20\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 4.7\n    percent: 91.3\n    note: \"Malto base\"\n  - malto: \"Crystal 60L\"\n    kg: 0.45\n    percent: 8.7\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Perle\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Cascade\"\n    grammi: 57\n    tempo_min: 30\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Cascade\"\n    grammi: 57\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1056 / White Labs WLP001 / Safale US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano pulito\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Luppolatura Cascade aromatica\"\n  - \"Profilo pulito e bilanciato\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aggiungere dry hop Cascade\"\n    impatto: \"Aroma più intenso\"\n";

//#endregion
//#region src/brewing/recipes/19-amber-brown-american/19A-american-amber-ale.yaml?raw
var _19A_american_amber_ale_default = "nome: \"Gordon Strong's American Amber Ale\"\nstile: \"American Amber Ale\"\ncodice_bjcp: \"19A\"\ndescrizione: |\n  Amber ale bilanciata con malti caramellati e tostati, luppolatura americana\n  moderata e finitura pulita.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-american-amber-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.054\n  fg: 1.012\n  abv_percent: 5.5\n  ibu: 30\n  ebc: 30\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale ale malt\"\n    kg: 4.1\n    percent: 80.9\n    note: \"Malto base\"\n  - malto: \"Dark Munich 9L\"\n    kg: 0.45\n    percent: 9.0\n    note: \"Corpo maltato\"\n  - malto: \"Crystal 60L\"\n    kg: 0.45\n    percent: 9.0\n    note: \"Caramello\"\n  - malto: \"Chocolate malt\"\n    kg: 0.06\n    percent: 1.1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Cascade\"\n    grammi: 28\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Mandarina Bavaria\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Hallertauer\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Cascade\"\n    grammi: 28\n    tempo_min: 0\n    uso: hop_stand\n\nlievito:\n  ceppo: \"Wyeast 1272 / White Labs WLP051 / Mangrove Jack's M36\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Malti caramellati e tostati bilanciati\"\n  - \"Luppolatura americana moderata\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Munich\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/19-amber-brown-american/19B-california-common.yaml?raw
var _19B_california_common_default = "nome: \"California Common\"\nstile: \"California Common\"\ncodice_bjcp: \"19B\"\ndescrizione: |\n  Stile \"steam beer\" fermentato a temperature da lager con lievito California,\n  corpo maltato e luppolatura Cluster caratteristica.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/california-common/\"\n  autore: \"BYO Staff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.012\n  abv_percent: 5.2\n  ibu: 35\n  ebc: 20\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"American 2-row pale ale malt\"\n    kg: 3.8\n    percent: 78.7\n    note: \"Malto base\"\n  - malto: \"Munich 10-20L\"\n    kg: 0.58\n    percent: 12.0\n    note: \"Corpo maltato\"\n  - malto: \"Crystal 60L\"\n    kg: 0.45\n    percent: 9.3\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Cluster\"\n    grammi: 45\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Cluster\"\n    grammi: 43\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2112 (California Lager) / White Labs WLP810 (San Francisco Lager)\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"16°C\"\n  note: \"Lievito California, fermentazione a temperature da lager\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Step: 54°C/30, 67°C/60, 76°C mash-out\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Lievito California a temperature da lager\"\n  - \"Luppolatura Cluster caratteristica\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Munich\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/19-amber-brown-american/19C-american-brown-ale.yaml?raw
var _19C_american_brown_ale_default = "nome: \"American Brown Ale (ispirata a Pete's Wicked Ale)\"\nstile: \"American Brown Ale\"\ncodice_bjcp: \"19C\"\ndescrizione: |\n  Brown ale americana con caramello e cioccolato, luppolatura Cascade/Brewers\n  Gold e dry hopping per un carattere fresco.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/american-brown-ale-style-profile/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.053\n  fg: 1.015\n  abv_percent: 5.1\n  ibu: 29\n  ebc: 45\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"US pale ale malt\"\n    kg: 3.7\n    percent: 73.1\n    note: \"Malto base\"\n  - malto: \"US crystal 60L\"\n    kg: 1.25\n    percent: 24.7\n    note: \"Caramello\"\n  - malto: \"US chocolate malt\"\n    kg: 0.11\n    percent: 2.2\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Cascade\"\n    grammi: 19\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Brewers Gold\"\n    grammi: 9\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Brewers Gold\"\n    grammi: 21\n    tempo_min: 5\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Cascade\"\n    grammi: 14\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Brewers Gold\"\n    grammi: 28\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1007 / White Labs WLP036 / SafAle K-97\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale tedesco/americano\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Dry hop per carattere fresco\"\n  - \"Crystal elevato per dolcezza caramellata\"\n\nalternative:\n  - descrizione: \"Versione più tostata\"\n    cambiamenti: \"Aumentare chocolate malt\"\n    impatto: \"Note tostate più decise\"\n";

//#endregion
//#region src/brewing/recipes/20-american-porter-stout/20A-american-porter.yaml?raw
var _20A_american_porter_default = "nome: \"Gordon Strong's Classic American Porter\"\nstile: \"American Porter\"\ncodice_bjcp: \"20A\"\ndescrizione: |\n  Porter \"lagered\" in stile nordest americano (tipo Yuengling), con note di\n  liquirizia ma senza eccessiva tostatura.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-classic-american-porter/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.014\n  abv_percent: 4.7\n  ibu: 23\n  ebc: 60\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"US 2-row pale malt\"\n    kg: 3.0\n    percent: 62.4\n    note: \"Malto base\"\n  - malto: \"US mild malt\"\n    kg: 0.68\n    percent: 14.1\n    note: \"Corpo dextrinoso\"\n  - malto: \"Flaked maize\"\n    kg: 0.45\n    percent: 9.4\n    note: \"Corpo\"\n  - malto: \"Crystal 50L\"\n    kg: 0.34\n    percent: 7.1\n    note: \"Caramello\"\n  - malto: \"Weyermann Carafa Special II\"\n    kg: 0.34\n    percent: 7.1\n    note: \"Colore e tostatura\"\n\nluppolatura:\n  - varieta: \"Cluster\"\n    grammi: 19\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Cascade\"\n    grammi: 7\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 2206 (Bavarian Lager)\"\n  forma: liquido\n  attenuazione_percent: 75\n  temperatura_fermentazione: \"10°C\"\n  note: \"Lievito lager, lagering a 1°C per 8 settimane\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 10\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 1\n  note: \"Lagering 1°C per 8 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Fermentazione lager per profilo pulito\"\n  - \"Carafa per colore senza eccessiva tostatura\"\n\nalternative:\n  - descrizione: \"Versione ale\"\n    cambiamenti: \"Usare lievito ale americano\"\n    impatto: \"Profilo più fruttato\"\n";

//#endregion
//#region src/brewing/recipes/20-american-porter-stout/20B-american-stout.yaml?raw
var _20B_american_stout_default = "nome: \"Jamil's American Stout\"\nstile: \"American Stout\"\ncodice_bjcp: \"20B\"\ndescrizione: |\n  Stout americana robusta e amara, con malti tostati e neri, corpo pieno e\n  luppolatura decisa.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/american-stout/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.072\n  fg: 1.017\n  abv_percent: 7.2\n  ibu: 73\n  ebc: 95\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Great Western pale malt 2L\"\n    kg: 6.11\n    percent: 85.6\n    note: \"Malto base\"\n  - malto: \"Briess black barley 500L\"\n    kg: 0.41\n    percent: 5.7\n    note: \"Tostatura\"\n  - malto: \"Crystal 40L\"\n    kg: 0.31\n    percent: 4.3\n    note: \"Caramello\"\n  - malto: \"Dark chocolate malt 420L\"\n    kg: 0.31\n    percent: 4.3\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Horizon\"\n    grammi: 33\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Centennial\"\n    grammi: 24\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP001 / Wyeast 1056 / Safale US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale americano pulito\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Amarezza decisa (73 IBU)\"\n  - \"Malti tostati e neri per carattere\"\n\nalternative:\n  - descrizione: \"Versione meno amara\"\n    cambiamenti: \"Ridurre IBU a 55\"\n    impatto: \"Più bilanciata\"\n";

//#endregion
//#region src/brewing/recipes/20-american-porter-stout/20C-imperial-stout.yaml?raw
var _20C_imperial_stout_default = "nome: \"American Imperial Stout\"\nstile: \"Imperial Stout\"\ncodice_bjcp: \"20C\"\ndescrizione: |\n  Imperial stout massiccia con doppio mash, malti di segale e avena, e zucchero\n  di canna per raggiungere 12% ABV. Invecchiabile per anni.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/american-imperial-stout/\"\n  autore: \"Dan Russo\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.130\n  fg: 1.040\n  abv_percent: 12.0\n  ibu: 60\n  ebc: 170\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row malted barley\"\n    kg: 6.6\n    percent: 55\n    note: \"Malto base\"\n  - malto: \"Flaked oats\"\n    kg: 1.2\n    percent: 10\n    note: \"Corpo\"\n  - malto: \"Munich dark malt\"\n    kg: 0.45\n    percent: 3.5\n    note: \"Corpo maltato\"\n  - malto: \"Carafa Special III\"\n    kg: 0.77\n    percent: 6.5\n    note: \"Colore\"\n  - malto: \"Chocolate rye malt\"\n    kg: 0.77\n    percent: 6.5\n    note: \"Tostatura\"\n  - malto: \"Roasted barley\"\n    kg: 0.37\n    percent: 3\n    note: \"Tostatura\"\n  - malto: \"Crystal rye 75L\"\n    kg: 0.77\n    percent: 6.5\n    note: \"Caramello\"\n  - malto: \"Brown sugar\"\n    kg: 1.1\n    percent: 9\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Warrior\"\n    grammi: 35\n    tempo_min: 90\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"White Labs WLP090 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 72\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale ad alta attenuazione, poi 21°C a fine fermentazione\"\n\nmash:\n  temperatura_c: 64\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Double mash\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Double mash per alta gravità\"\n  - \"Zucchero di canna per raggiungere 12% ABV\"\n  - \"Invecchiabile per anni\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.100\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/21-ipa/21A-american-ipa.yaml?raw
var _21A_american_ipa_default = "nome: \"Peachtree IPA\"\nstile: \"American IPA\"\ncodice_bjcp: \"21A\"\ndescrizione: |\n  IPA americana semplice e premiata (1° posto War of the Worts), con base maltata\n  pulita e luppolatura Nugget/Simcoe/Amarillo/Citra per aroma intenso.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/awardwinning-ipa-recipes/\"\n  autore: \"Josh Weikert\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Vincitrice 1° posto War of the Worts (dichiarato dalla fonte).\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.063\n  fg: 1.012\n  abv_percent: 6.7\n  ibu: 66\n  ebc: 18\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"US 2-row pale malt\"\n    kg: 5.3\n    percent: 80.9\n    note: \"Malto base\"\n  - malto: \"Munich 9L\"\n    kg: 0.64\n    percent: 9.8\n    note: \"Corpo maltato\"\n  - malto: \"Crystal 20L\"\n    kg: 0.36\n    percent: 5.5\n    note: \"Caramello\"\n  - malto: \"Crystal 40L\"\n    kg: 0.25\n    percent: 3.8\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Nugget\"\n    grammi: 35\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Simcoe\"\n    grammi: 35\n    tempo_min: 5\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Amarillo\"\n    grammi: 35\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Citra\"\n    grammi: 35\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1056 / White Labs WLP001 / Fermentis US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano pulito\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Luppolatura intensa Nugget/Simcoe/Amarillo/Citra\"\n  - \"Base maltata pulita\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aggiungere dry hop aggiuntivo\"\n    impatto: \"Aroma più intenso\"\n";

//#endregion
//#region src/brewing/recipes/21-ipa/21B-specialty-ipa-black-ipa.yaml?raw
var _21B_specialty_ipa_black_ipa_default = "nome: \"Black IPA (NHC 2017 Gold)\"\nstile: \"Specialty IPA — Black IPA\"\ncodice_bjcp: \"21B\"\ndescrizione: |\n  Ricetta medaglia d'oro NHC 2017 nella categoria Specialty IPA. IPA americana\n  scurita con malti tostati che aggiungono note di cioccolato a una base molto\n  luppolata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/black-ipa-nhc-2017-gold/\"\n  autore: \"Nicholas McCoy & Father Jefferey Poirot\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Medaglia d'oro NHC 2017 (dichiarato dalla fonte).\"\n\nparametri:\n  batch_size_litri: 51\n  og: 1.080\n  fg: 1.016\n  abv_percent: 8.4\n  ibu: 79\n  ebc: 82\n  efficienza_percent: 75\n  impianto: \"All grain 51L\"\n  volume_fermentatore: 51\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 15.88\n    percent: 83.4\n    note: \"Malto base\"\n  - malto: \"Caramunich III\"\n    kg: 1.36\n    percent: 7.1\n    note: \"Caramello\"\n  - malto: \"Midnight Wheat\"\n    kg: 1.18\n    percent: 6.2\n    note: \"Colore scuro\"\n  - malto: \"Table sugar (sucrose)\"\n    kg: 0.61\n    percent: 3.2\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Hallertau Magnum\"\n    grammi: 56.7\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Chinook\"\n    grammi: 70.9\n    tempo_min: 20\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Centennial\"\n    grammi: 42.5\n    tempo_min: 20\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Centennial\"\n    grammi: 113.4\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Centennial\"\n    grammi: 85\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Citra\"\n    grammi: 85\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"Wyeast 1056 (American Ale), 4 pacchetti\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 60\n  volume_post_boil_litri: 51\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Malti tostati per note di cioccolato\"\n  - \"Luppolatura intensa\"\n\nalternative:\n  - descrizione: \"Versione 19L\"\n    cambiamenti: \"Scalare le quantità a 1/3\"\n    impianto: \"Batch più piccolo\"\n";

//#endregion
//#region src/brewing/recipes/21-ipa/21B1-new-england-ipa.yaml?raw
var _21B1_new_england_ipa_default = "nome: \"New England IPA\"\nstile: \"New England IPA (Hazy IPA)\"\ncodice_bjcp: \"21B1\"\ndescrizione: |\n  NEIPA torbida con avena e frumento, triple dry hopping di Citra/Galaxy/Mosaic\n  per intenso aroma tropicale. Non filtrata né chiarificata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/new-england-ipa/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.061\n  fg: 1.012\n  abv_percent: 6.5\n  ibu: 56\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"US 2-row malt\"\n    kg: 4.1\n    percent: 70.7\n    note: \"Malto base\"\n  - malto: \"UK Golden Promise\"\n    kg: 0.91\n    percent: 15.7\n    note: \"Malto base\"\n  - malto: \"Flaked wheat\"\n    kg: 0.45\n    percent: 7.8\n    note: \"Corpo e torbidità\"\n  - malto: \"Flaked oats\"\n    kg: 0.34\n    percent: 5.9\n    note: \"Corpo morbido\"\n\nluppolatura:\n  - varieta: \"Amarillo\"\n    grammi: 43\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Amarillo\"\n    grammi: 43\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Citra\"\n    grammi: 28\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Galaxy\"\n    grammi: 28\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Mosaic\"\n    grammi: 28\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Citra\"\n    grammi: 85\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Galaxy\"\n    grammi: 43\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Mosaic\"\n    grammi: 43\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"GigaYeast GY054 (Vermont IPA) / White Labs WLP095 (Burlington Ale)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito NEIPA, con salita naturale\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 18\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Triple dry hopping per aroma tropicale\"\n  - \"Non filtrata né chiarificata\"\n  - \"Avena e frumento per torbidità\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre avena e frumento\"\n    impatto: \"Meno torbida\"\n";

//#endregion
//#region src/brewing/recipes/21-ipa/21C-hazy-ipa.yaml?raw
var _21C_hazy_ipa_default = "nome: \"New England IPA\"\nstile: \"Hazy IPA (New England IPA)\"\ncodice_bjcp: \"21C\"\ndescrizione: |\n  Hazy IPA con dry hop in tre dosi durante e dopo la fermentazione; non filtrata\n  né chiarificata per preservare la torbidità e l'aroma.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/new-england-ipa/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.061\n  fg: 1.012\n  abv_percent: 6.5\n  ibu: 56\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"US 2-row malt\"\n    kg: 4.08\n    percent: 70.6\n    note: \"Malto base\"\n  - malto: \"UK Golden Promise\"\n    kg: 0.91\n    percent: 15.7\n    note: \"Malto base\"\n  - malto: \"Flaked wheat\"\n    kg: 0.45\n    percent: 7.8\n    note: \"Corpo e torbidità\"\n  - malto: \"Flaked oats\"\n    kg: 0.34\n    percent: 5.9\n    note: \"Corpo morbido\"\n\nluppolatura:\n  - varieta: \"Amarillo\"\n    grammi: 42.5\n    tempo_min: 0\n    uso: first_wort\n  - varieta: \"Amarillo\"\n    grammi: 42.5\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Citra\"\n    grammi: 28.4\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Galaxy\"\n    grammi: 28.4\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Mosaic\"\n    grammi: 28.4\n    tempo_min: 0\n    uso: hop_stand\n  - varieta: \"Citra\"\n    grammi: 85\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Galaxy\"\n    grammi: 42.5\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n  - varieta: \"Mosaic\"\n    grammi: 42.5\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"GigaYeast GY054 (Vermont IPA) / White Labs WLP095 (Burlington Ale)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito NEIPA, con salita naturale\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 18\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Dry hop in tre dosi\"\n  - \"Non filtrata né chiarificata\"\n\nalternative:\n  - descrizione: \"Versione più chiara\"\n    cambiamenti: \"Ridurre avena e frumento\"\n    impatto: \"Meno torbida\"\n";

//#endregion
//#region src/brewing/recipes/22-strong-american/22A-double-ipa.yaml?raw
var _22A_double_ipa_default = "nome: \"Mike McDole's Double IPA\"\nstile: \"Double IPA (Imperial IPA)\"\ncodice_bjcp: \"22A\"\ndescrizione: |\n  Double IPA da 10% ABV con mash hopping e luppolatura massiccia di\n  Chinook/Warrior/Simcoe/Columbus, corpo pieno e amaro intenso.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/mike-mcdoles-double-ipa/\"\n  autore: \"Mike McDole\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.095\n  fg: 1.020\n  abv_percent: 10.0\n  ibu: 100\n  ebc: 15\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"American 2-row malt\"\n    kg: 7.3\n    percent: 86.5\n    note: \"Malto base\"\n  - malto: \"Briess Cara-Pils 2L\"\n    kg: 0.45\n    percent: 5.3\n    note: \"Schiuma e corpo\"\n  - malto: \"Corn sugar\"\n    kg: 0.23\n    percent: 2.7\n    note: \"Attenuazione\"\n  - malto: \"Crystal 40L\"\n    kg: 0.23\n    percent: 2.7\n    note: \"Caramello\"\n  - malto: \"Wheat malt\"\n    kg: 0.23\n    percent: 2.7\n    note: \"Corpo\"\n\nluppolatura:\n  - varieta: \"Chinook\"\n    grammi: 21\n    tempo_min: 0\n    uso: mash\n    note: \"Mash hop\"\n  - varieta: \"Warrior\"\n    grammi: 43\n    tempo_min: 90\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Chinook\"\n    grammi: 28\n    tempo_min: 90\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Simcoe\"\n    grammi: 21\n    tempo_min: 45\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Columbus\"\n    grammi: 21\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Ceppo ale americano pulito (es. US-05 / WLP001)\"\n  forma: secco\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano, poi salita a 22°C\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 45\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Mash hopping per amaro complesso\"\n  - \"Alta gravità, pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno amara\"\n    cambiamenti: \"Ridurre IBU a 80\"\n    impatto: \"Più bilanciata\"\n";

//#endregion
//#region src/brewing/recipes/22-strong-american/22B-american-strong-ale.yaml?raw
var _22B_american_strong_ale_default = "nome: \"Oceanside Ale Works' American Strong Ale clone\"\nstile: \"American Strong Ale\"\ncodice_bjcp: \"22B\"\ndescrizione: |\n  Ibrido tra strong ale inglese, americana e belga: ricchezza di malto inglese,\n  lievito neutro americano e candi sugar belga come adjunct.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/oceanside-ale-works-american-strong-ale-clone/\"\n  autore: \"Glenn BurnSilver (Head Brewer Mark Purciel)\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.082\n  fg: 1.014\n  abv_percent: 9.2\n  ibu: 83\n  ebc: 44\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 3.63\n    percent: 50.0\n    note: \"Malto base\"\n  - malto: \"Munich malt\"\n    kg: 1.81\n    percent: 25.0\n    note: \"Corpo maltato\"\n  - malto: \"Briess caramel Munich (60°L)\"\n    kg: 0.45\n    percent: 6.25\n    note: \"Caramello\"\n  - malto: \"Briess Victory malt\"\n    kg: 0.45\n    percent: 6.25\n    note: \"Tostatura\"\n  - malto: \"Belgian candi sugar\"\n    kg: 0.45\n    percent: 6.25\n    note: \"Attenuazione\"\n  - malto: \"Corn sugar\"\n    kg: 0.45\n    percent: 6.25\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Nugget\"\n    grammi: 21.3\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Millennium\"\n    grammi: 21.3\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Columbus\"\n    grammi: 21.3\n    tempo_min: 15\n    uso: boil\n    note: \"Sapore\"\n  - varieta: \"Cascade\"\n    grammi: 21.3\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"White Labs WLP001 (California Ale), starter da 3.5L\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 20\n  dry_hop_giorno: 7\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Candi sugar belga come adjunct\"\n  - \"Alta gravità, pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.075\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/22-strong-american/22C-american-barleywine.yaml?raw
var _22C_american_barleywine_default = "nome: \"Jamil's American Barleywine\"\nstile: \"American Barleywine\"\ncodice_bjcp: \"22C\"\ndescrizione: |\n  Barleywine americana da 12.5% ABV con lunga bollitura (120 min), luppolatura\n  intensa e malti crystal per complessità. Da invecchiare.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/jamils-american-barleywine/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.115\n  fg: 1.022\n  abv_percent: 12.5\n  ibu: 99\n  ebc: 34\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Great Western pale malt 2L\"\n    kg: 9.4\n    percent: 87.0\n    note: \"Malto base\"\n  - malto: \"Dextrose\"\n    kg: 0.4\n    percent: 3.7\n    note: \"Attenuazione\"\n  - malto: \"Briess crystal 20L\"\n    kg: 0.4\n    percent: 3.7\n    note: \"Caramello\"\n  - malto: \"Baird British crystal 75L\"\n    kg: 0.4\n    percent: 3.7\n    note: \"Caramello scuro\"\n  - malto: \"Thomas Fawcett pale chocolate 200L\"\n    kg: 0.1\n    percent: 0.9\n    note: \"Tostatura\"\n  - malto: \"Franco-Belges Special B 150L\"\n    kg: 0.1\n    percent: 0.9\n    note: \"Frutta secca\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 58\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Chinook\"\n    grammi: 24\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Centennial\"\n    grammi: 35\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Amarillo\"\n    grammi: 35\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Safale US-05\"\n  forma: secco\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano, poi 21°C nell'ultimo terzo\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 120\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Bollitura 120 min per concentrazione\"\n  - \"Alta gravità, pitch rate elevato\"\n  - \"Da invecchiare\"\n\nalternative:\n  - descrizione: \"Versione più leggera\"\n    cambiamenti: \"Ridurre OG a 1.100\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/22-strong-american/22D-wheatwine.yaml?raw
var _22D_wheatwine_default = "nome: \"Winter's Wheatwine\"\nstile: \"Wheatwine\"\ncodice_bjcp: \"22D\"\ndescrizione: |\n  Wheatwine ad alta gravità con luppolatura moderna (Citra, Nelson Sauvin,\n  Motueka) su una base di malto di frumento tedesco; birra da invecchiamento.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/winters-wheatwine/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.102\n  fg: 1.018\n  abv_percent: 11.4\n  ibu: 51\n  ebc: 18\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German wheat malt\"\n    kg: 5.44\n    percent: 60.0\n    note: \"Frumento\"\n  - malto: \"German Pilsner malt\"\n    kg: 1.59\n    percent: 17.5\n    note: \"Malto base\"\n  - malto: \"Flaked wheat\"\n    kg: 0.45\n    percent: 5.0\n    note: \"Corpo\"\n  - malto: \"Caramel wheat malt (~50°L)\"\n    kg: 0.45\n    percent: 5.0\n    note: \"Caramello\"\n  - malto: \"Honey malt\"\n    kg: 0.23\n    percent: 2.5\n    note: \"Dolcezza\"\n  - malto: \"White sugar\"\n    kg: 0.91\n    percent: 10.0\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 42.5\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Citra\"\n    grammi: 28.4\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Nelson Sauvin\"\n    grammi: 28.4\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Motueka\"\n    grammi: 28.4\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP001 / Wyeast 1056 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito ale americano, max 22°C\"\n\nmash:\n  temperatura_c: 63\n  durata_min: 80\n  spessore_l_kg: 3.0\n  note: \"Multi-step: 40°C/10, 55°C/15, 63°C/40, 70°C/15, mashout 76°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Alta gravità, pitch rate elevato\"\n  - \"Da invecchiare\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.090\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23A-berliner-weisse.yaml?raw
var _23A_berliner_weisse_default = "nome: \"Napoleon's Champagne (Berliner Weisse)\"\nstile: \"Berliner Weisse\"\ncodice_bjcp: \"23A\"\ndescrizione: |\n  Berliner Weisse acida e rinfrescante, molto chiara e leggera, con acidità\n  lattica pulita e bassa luppolatura.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/berliner-weisse-napoleons-champagne/\"\n  autore: \"BYO Staff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.030\n  fg: 1.004\n  abv_percent: 3.0\n  ibu: 9\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Durst Pilsner malt\"\n    kg: 1.81\n    percent: 67\n    note: \"Malto base\"\n  - malto: \"Wheat malt\"\n    kg: 0.91\n    percent: 33\n    note: \"Frumento\"\n\nluppolatura:\n  - varieta: \"Spalt\"\n    grammi: 28\n    tempo_min: 15\n    uso: boil\n    note: \"Amaro leggero\"\n\nlievito:\n  ceppo: \"Wyeast 1007 (German Ale) / WLP029 + Wyeast 4335 (Lactobacillus)\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"17°C\"\n  note: \"Co-fermentazione con Lactobacillus, condizionamento 21-27°C\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 45\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Acidità lattica pulita\"\n  - \"Luppolatura minima\"\n\nalternative:\n  - descrizione: \"Versione più acida\"\n    cambiamenti: \"Aumentare il tempo di acidificazione\"\n    impatto: \"Acidità più marcata\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23B-flanders-red-ale.yaml?raw
var _23B_flanders_red_ale_default = "nome: \"Flanders Red Ale\"\nstile: \"Flanders Red Ale\"\ncodice_bjcp: \"23B\"\ndescrizione: |\n  Flanders red acida e complessa, con note di frutta rossa, legno di quercia e\n  acidità lattica/acetica, invecchiata in botte.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/flanders-red-ale/\"\n  autore: \"Andrew Reudink\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.061\n  fg: 1.008\n  abv_percent: 7.0\n  ibu: 5\n  ebc: 44\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 1.36\n    percent: 20\n    note: \"Malto base\"\n  - malto: \"Vienna malt\"\n    kg: 1.36\n    percent: 20\n    note: \"Corpo maltato\"\n  - malto: \"Best Malz Red X malt\"\n    kg: 1.36\n    percent: 20\n    note: \"Colore rosso\"\n  - malto: \"German Munich malt (6°L)\"\n    kg: 0.45\n    percent: 7\n    note: \"Corpo maltato\"\n  - malto: \"Aromatic malt\"\n    kg: 0.23\n    percent: 3\n    note: \"Aroma maltato\"\n  - malto: \"Caramunich II malt\"\n    kg: 0.23\n    percent: 3\n    note: \"Caramello\"\n  - malto: \"Special B malt\"\n    kg: 0.23\n    percent: 3\n    note: \"Frutta secca\"\n  - malto: \"Red wheat malt\"\n    kg: 0.23\n    percent: 3\n    note: \"Corpo\"\n  - malto: \"Amber candi syrup\"\n    kg: 0.45\n    percent: 7\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Hallertau\"\n    grammi: 14\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro leggero\"\n\nlievito:\n  ceppo: \"Imperial Yeast G02 (Kaiser) / WLP036, poi blend Imperial F08 (Sour Batch Kidz) / WLP665 (Flemish Ale)\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"17°C\"\n  note: \"Fermentazione 10-14 giorni, poi inoculo blend acido\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Invecchiamento in botte per acidità\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Invecchiamento in botte per acidità e legno\"\n  - \"Blend acido per acidità lattica/acetica\"\n\nalternative:\n  - descrizione: \"Versione meno acida\"\n    cambiamenti: \"Ridurre il tempo in botte\"\n    impatto: \"Acidità più contenuta\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23C-oud-bruin.yaml?raw
var _23C_oud_bruin_default = "nome: \"Flanders Brown Ale (Oud Bruin)\"\nstile: \"Oud Bruin (Flanders Brown Ale)\"\ncodice_bjcp: \"23C\"\ndescrizione: |\n  Oud Bruin fiammingo con acidità da batteri lattici e legno di quercia. Mash a\n  step per corpo e complessità, con invecchiamento in bottiglia per almeno 6 mesi.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/flanders-brown-ale/\"\n  autore: \"Horst Dornbusch\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.012\n  abv_percent: 4.7\n  ibu: 20\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale Pils malt\"\n    kg: 2.3\n    percent: 48.9\n    note: \"Malto base\"\n  - malto: \"6-row pale brewers malt\"\n    kg: 0.57\n    percent: 12.1\n    note: \"Malto base\"\n  - malto: \"Vienna malt\"\n    kg: 0.86\n    percent: 18.3\n    note: \"Corpo maltato\"\n  - malto: \"Crystal malt (40°L)\"\n    kg: 0.97\n    percent: 20.6\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Hallertauer Mittelfrüh\"\n    grammi: 39\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 28\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1388 / WLP550 + Wyeast 5335 (Lactobacillus buchneri)\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Acidità da batteri lattici\"\n\nmash:\n  temperatura_c: 62\n  durata_min: 100\n  spessore_l_kg: 3.0\n  note: \"Step: 52°C/20, 62°C/40, 72°C/40\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Invecchiamento in bottiglia almeno 6 mesi\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Acidità da batteri lattici\"\n  - \"Invecchiamento in bottiglia 6+ mesi\"\n\nalternative:\n  - descrizione: \"Versione meno acida\"\n    cambiamenti: \"Ridurre il tempo di invecchiamento\"\n    impatto: \"Acidità più contenuta\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23D-lambic.yaml?raw
var _23D_lambic_default = "nome: \"Zoc's Traditional Lambic\"\nstile: \"Lambic\"\ncodice_bjcp: \"23D\"\ndescrizione: |\n  Lambic tradizionale con frumento non maltato e luppoli invecchiati per la sola\n  conservazione. Fermentazione spontanea/mista con invecchiamento prolungato in botte.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/zocs-traditional-lambic/\"\n  autore: \"Paul Zocco\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.045\n  fg: 1.008\n  abv_percent: 4.8\n  ibu: 10\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pale malt\"\n    kg: 2.7\n    percent: 60.0\n    note: \"Malto base\"\n  - malto: \"Malted wheat\"\n    kg: 0.9\n    percent: 20.0\n    note: \"Frumento maltato\"\n  - malto: \"Unmalted wheat\"\n    kg: 0.9\n    percent: 20.0\n    note: \"Frumento non maltato\"\n\nluppolatura:\n  - varieta: \"Aged Styrian Goldings\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Luppoli invecchiati per conservazione\"\n\nlievito:\n  ceppo: \"Wyeast 3278 (Belgian Lambic Blend) / WLP655 (Belgian Sour Mix 1)\"\n  forma: liquido\n  attenuazione_percent: 85\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lactobacillus, Pediococcus, Brettanomyces bruxellensis e claussenii\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 120\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 30\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Invecchiamento ≥ 1 anno in botte di rovere\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Frumento non maltato\"\n  - \"Luppoli invecchiati per conservazione\"\n  - \"Invecchiamento ≥ 1 anno in botte\"\n\nalternative:\n  - descrizione: \"Versione più acida\"\n    cambiamenti: \"Aumentare il tempo in botte\"\n    impatto: \"Acidità più marcata\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23E-gueuze.yaml?raw
var _23E_gueuze_default = "nome: \"Gilligan's Gueuze (Blended Lambic)\"\nstile: \"Gueuze\"\ncodice_bjcp: \"23E\"\ndescrizione: |\n  Gueuze ottenuta da mash turbido a step e blend di lambic di tre annate diverse.\n  Luppoli invecchiati per conservazione, acidità e complessità da fermentazione mista.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gilligans-gueuze-blended-lambic/\"\n  autore: \"BYO Staff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.052\n  fg: 1.003\n  abv_percent: 5.0\n  ibu: 0\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Dingemans Pilsen malt\"\n    kg: 3.1\n    percent: 64.6\n    note: \"Malto base\"\n  - malto: \"Unmalted wheat\"\n    kg: 1.7\n    percent: 35.4\n    note: \"Frumento non maltato\"\n\nluppolatura:\n  - varieta: \"Aged (debittered) hops\"\n    grammi: 84\n    tempo_min: 90\n    uso: boil\n    note: \"Luppoli invecchiati per conservazione\"\n\nlievito:\n  ceppo: \"Wyeast 3278 (Lambic Blend, lieviti + batteri)\"\n  forma: liquido\n  attenuazione_percent: 90\n  temperatura_fermentazione: \"21°C\"\n  note: \"Condizionamento 21-27°C per 3 mesi, blend di 3 annate\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 85\n  spessore_l_kg: 3.0\n  note: \"Step: 45°C/10, 55°C/15, 65°C/45, 72°C/15, mashout 76°C\"\n\nbollitura:\n  durata_min: 120\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 30\n  temperatura_c: 21\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Blend di 3 annate di lambic\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Mash turbido a step\"\n  - \"Blend di 3 annate\"\n  - \"Luppoli invecchiati per conservazione\"\n\nalternative:\n  - descrizione: \"Versione più acida\"\n    cambiamenti: \"Aumentare la quota di lambic vecchio\"\n    impatto: \"Acidità più marcata\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23F-fruit-lambic.yaml?raw
var _23F_fruit_lambic_default = "nome: \"Jolly Rancher Apple Lambic\"\nstile: \"Fruit Lambic\"\ncodice_bjcp: \"23F\"\ndescrizione: |\n  Fruit lambic alla mela con base di malto d'orzo e frumento, luppoli invecchiati\n  e fermentazione mista. La frutta viene aggiunta in secondario dopo la\n  fermentazione primaria.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/jolly-rancher-apple-lambic/\"\n  autore: \"Chris Colby\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.065\n  fg: 1.006\n  abv_percent: 6.3\n  ibu: 11\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 2.3\n    percent: 62.2\n    note: \"Malto base\"\n  - malto: \"Wheat malt\"\n    kg: 1.4\n    percent: 37.8\n    note: \"Frumento\"\n\nluppolatura:\n  - varieta: \"Saaz (aged)\"\n    grammi: 85\n    tempo_min: 60\n    uso: boil\n    note: \"Luppoli invecchiati per conservazione\"\n\nlievito:\n  ceppo: \"Wyeast 3278 (Lambic Blend, lieviti + batteri)\"\n  forma: liquido\n  attenuazione_percent: 88\n  temperatura_fermentazione: \"21°C\"\n  note: \"Condizionamento 21-24°C per ≥ 3 mesi\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 120\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 30\n  temperatura_c: 21\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Frutta (1.8kg caramelle di mela) aggiunta in secondario\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Frutta aggiunta in secondario\"\n  - \"Luppoli invecchiati per conservazione\"\n\nalternative:\n  - descrizione: \"Versione con frutta fresca\"\n    cambiamenti: \"Usare 2kg di mele fresche\"\n    impatto: \"Sapore di frutta più naturale\"\n";

//#endregion
//#region src/brewing/recipes/23-european-sour/23G-gose.yaml?raw
var _23G_gose_default = "nome: \"Gordon Strong's German Gose\"\nstile: \"Gose\"\ncodice_bjcp: \"23G\"\ndescrizione: |\n  Gose tedesca leggermente acida e salata, con coriandolo, molto rinfrescante e\n  a bassa gradazione.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/german-gose/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.042\n  fg: 1.008\n  abv_percent: 4.5\n  ibu: 9\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German wheat malt\"\n    kg: 2.27\n    percent: 58\n    note: \"Frumento\"\n  - malto: \"Belgian Pilsner malt\"\n    kg: 1.59\n    percent: 42\n    note: \"Malto base\"\n\nluppolatura:\n  - varieta: \"Czech Saaz\"\n    grammi: 20\n    tempo_min: 0\n    uso: first_wort\n\nlievito:\n  ceppo: \"Wyeast 1007 (German Ale) / WLP029; acidificazione con L. plantarum\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"18°C\"\n  note: \"Acidificazione con L. plantarum\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Coriandolo 7.5g e sale kosher 10g a 0 min\"\n  - \"Acidità lattica leggera\"\n\nalternative:\n  - descrizione: \"Versione più salata\"\n    cambiamenti: \"Aumentare il sale\"\n    impatto: \"Salinità più marcata\"\n";

//#endregion
//#region src/brewing/recipes/24-belgian-ale/24A-witbier.yaml?raw
var _24A_witbier_default = "nome: \"Gordon Strong's Witbier\"\nstile: \"Witbier\"\ncodice_bjcp: \"24A\"\ndescrizione: |\n  Witbier belga torbida e speziata, con grano e avena in fiocchi per corpo morbido\n  e note di agrumi e coriandolo.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-witbier/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.050\n  fg: 1.011\n  abv_percent: 5.1\n  ibu: 12\n  ebc: 7\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"German Pilsner malt\"\n    kg: 2.49\n    percent: 49\n    note: \"Malto base\"\n  - malto: \"Flaked wheat\"\n    kg: 2.27\n    percent: 45\n    note: \"Frumento in fiocchi\"\n  - malto: \"Flaked oats\"\n    kg: 0.23\n    percent: 5\n    note: \"Corpo morbido\"\n\nluppolatura:\n  - varieta: \"Sterling\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 3944 (Belgian Witbier) / WLP400 / SafAle T-58\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito witbier belga\"\n\nmash:\n  temperatura_c: 60\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 50°C/15, 64°C/45\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Coriandolo 14g, buccia d'arancia Curaçao 7g, camomilla 1.8g a fine bollitura\"\n  - \"Grano e avena in fiocchi per corpo morbido\"\n\nalternative:\n  - descrizione: \"Versione più speziata\"\n    cambiamenti: \"Aumentare coriandolo\"\n    impatto: \"Speziatura più marcata\"\n";

//#endregion
//#region src/brewing/recipes/24-belgian-ale/24B-belgian-pale-ale.yaml?raw
var _24B_belgian_pale_ale_default = "nome: \"Gordon Strong's Belgian Pale Ale\"\nstile: \"Belgian Pale Ale\"\ncodice_bjcp: \"24B\"\ndescrizione: |\n  Belgian pale ale ambrata e maltata con carattere di lievito belga fruttato-speziato\n  e luppolo nobile Saaz.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-belgian-pale-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.047\n  fg: 1.010\n  abv_percent: 5.0\n  ibu: 25\n  ebc: 24\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 2.72\n    percent: 62\n    note: \"Malto base\"\n  - malto: \"Vienna malt\"\n    kg: 1.13\n    percent: 26\n    note: \"Corpo maltato\"\n  - malto: \"Aromatic malt\"\n    kg: 0.23\n    percent: 5\n    note: \"Aroma maltato\"\n  - malto: \"Caramunich III / crystal (80°L)\"\n    kg: 0.23\n    percent: 5\n    note: \"Caramello\"\n  - malto: \"Biscuit malt\"\n    kg: 0.17\n    percent: 4\n    note: \"Tostatura\"\n  - malto: \"Debittered black malt\"\n    kg: 0.01\n    percent: 1\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Saaz\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 2\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP515 (Antwerp Ale) / Wyeast 3655 / SafAle S-33\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito belga, free rise max 25°C\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Lievito belga per carattere fruttato-speziato\"\n  - \"Luppolo nobile Saaz\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aumentare Vienna\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/24-belgian-ale/24C-biere-de-garde.yaml?raw
var _24C_biere_de_garde_default = "nome: \"Bière de Garde\"\nstile: \"Bière de Garde\"\ncodice_bjcp: \"24C\"\ndescrizione: |\n  Bière de Garde robusta (9% ABV) con malti francesi e luppoli nobili.\n  Fermentazione fresca con lievito francese e lunga maturazione per un profilo\n  maltato e pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/biere-de-garde/\"\n  autore: \"Mikoli Weaver\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.080\n  fg: 1.012\n  abv_percent: 9.0\n  ibu: 31\n  ebc: 24\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"MFB two-row pale malt\"\n    kg: 5.7\n    percent: 73.6\n    note: \"Malto base\"\n  - malto: \"MFB Munich malt (7°L)\"\n    kg: 0.91\n    percent: 11.8\n    note: \"Corpo maltato\"\n  - malto: \"Caramel pilsen malt\"\n    kg: 0.45\n    percent: 5.8\n    note: \"Caramello\"\n  - malto: \"MFB special aromatic malt (4°L)\"\n    kg: 0.34\n    percent: 4.4\n    note: \"Aroma maltato\"\n  - malto: \"Caramel malt (20°L)\"\n    kg: 0.23\n    percent: 3.0\n    note: \"Caramello\"\n  - malto: \"Kiln coffee malt (150°L)\"\n    kg: 0.11\n    percent: 1.5\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Hallertau\"\n    grammi: 50\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Strisselspalt\"\n    grammi: 35\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3725 (Bière de Garde) / White Labs WLP072 (French Ale)\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito francese, poi secondario fino a FG 1.012\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Secondario fino a FG 1.012\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Malti francesi per profilo maltato\"\n  - \"Lunga maturazione\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.070\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/25-strong-belgian/25A-belgian-blond-ale.yaml?raw
var _25A_belgian_blond_ale_default = "nome: \"Gordon Strong's Belgian Blond Ale\"\nstile: \"Belgian Blond Ale\"\ncodice_bjcp: \"25A\"\ndescrizione: |\n  Belgian blond dorata e secca, con esteri fruttati del lievito trappista, corpo\n  medio e finale pulito.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-belgian-blond-ale/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.063\n  fg: 1.013\n  abv_percent: 6.6\n  ibu: 25\n  ebc: 14\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Belgian Pilsner malt\"\n    kg: 4.76\n    percent: 78\n    note: \"Malto base\"\n  - malto: \"Aromatic malt\"\n    kg: 0.34\n    percent: 6\n    note: \"Aroma maltato\"\n  - malto: \"Flaked maize\"\n    kg: 0.45\n    percent: 7\n    note: \"Corpo\"\n  - malto: \"Caravienne / caramel (20°L)\"\n    kg: 0.34\n    percent: 6\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Saaz\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer\"\n    grammi: 28\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Styrian Goldings\"\n    grammi: 28\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3787 (Trappist High Gravity) / WLP530 / Safbrew BE-256\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"19°C\"\n  note: \"Lievito trappista\"\n\nmash:\n  temperatura_c: 63\n  durata_min: 70\n  spessore_l_kg: 3.0\n  note: \"Step: 55°C/15, 63°C/40, 70°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 19\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Lievito trappista per esteri fruttati\"\n  - \"Finale secco e pulito\"\n\nalternative:\n  - descrizione: \"Versione più secca\"\n    cambiamenti: \"Aumentare l'attenuazione\"\n    impatto: \"Finale più asciutto\"\n";

//#endregion
//#region src/brewing/recipes/25-strong-belgian/25B-saison.yaml?raw
var _25B_saison_default = "nome: \"Table Saison\"\nstile: \"Saison\"\ncodice_bjcp: \"25B\"\ndescrizione: |\n  Saison da tavola leggera e molto secca, con carattere di lievito farmhouse\n  pepato e fruttato, altamente attenuata.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/table-saison-recipe/\"\n  autore: \"Drew Beechum\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.039\n  fg: 1.004\n  abv_percent: 4.5\n  ibu: 20\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Belgian Pilsner malt\"\n    kg: 2.72\n    percent: 79\n    note: \"Malto base\"\n  - malto: \"Caravienne malt\"\n    kg: 0.2\n    percent: 6\n    note: \"Caramello\"\n  - malto: \"Cane sugar\"\n    kg: 0.36\n    percent: 10\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 11\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Willamette\"\n    grammi: 14\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3726 (Farmhouse) / Imperial B56 (Rustic) / LalBrew Farmhouse\"\n  forma: liquido\n  attenuazione_percent: 85\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito farmhouse, free rise 18-24°C\"\n\nmash:\n  temperatura_c: 64\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Alta attenuazione per finale secco\"\n  - \"Lievito farmhouse per carattere pepato\"\n\nalternative:\n  - descrizione: \"Versione più corposa\"\n    cambiamenti: \"Ridurre lo zucchero\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/25-strong-belgian/25C-belgian-golden-strong-ale.yaml?raw
var _25C_belgian_golden_strong_ale_default = "nome: \"Brouwerij Duvel Moortgat's Duvel clone\"\nstile: \"Belgian Golden Strong Ale\"\ncodice_bjcp: \"25C\"\ndescrizione: |\n  Clone di Duvel: golden strong ale molto secca e alcolica, chiara, con esteri\n  fruttati e finale asciutto.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/duvel-clone/\"\n  autore: \"Chris Colby\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.061\n  fg: 1.007\n  abv_percent: 8.5\n  ibu: 30\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Belgian Pilsner malt\"\n    kg: 5.22\n    percent: 78\n    note: \"Malto base\"\n  - malto: \"Corn sugar (kettle)\"\n    kg: 0.23\n    percent: 3\n    note: \"Attenuazione\"\n  - malto: \"Corn sugar (dosage)\"\n    kg: 0.45\n    percent: 7\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Styrian Goldings\"\n    grammi: 34\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 27\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Saaz\"\n    grammi: 21\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1388 (Belgian Strong Ale) / WLP570 (Belgian Golden Ale)\"\n  forma: liquido\n  attenuazione_percent: 85\n  temperatura_fermentazione: \"16°C\"\n  note: \"Lievito belga, free rise fino a 29°C\"\n\nmash:\n  temperatura_c: 62\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 55→60→64°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.0\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Zucchero per attenuazione elevata\"\n  - \"Free rise fino a 29°C per esteri\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre lo zucchero\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/26-trappist/26A-trappist-single.yaml?raw
var _26A_trappist_single_default = "nome: \"Belgian Single (Trappist Single)\"\nstile: \"Trappist Single\"\ncodice_bjcp: \"26A\"\ndescrizione: |\n  Trappist single chiara, secca e luppolata, con carattere di lievito trappista\n  fruttato-speziato e finale amaro e croccante.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/trappist-style-single/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.049\n  fg: 1.007\n  abv_percent: 5.5\n  ibu: 35\n  ebc: 6\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Belgian Pilsner malt\"\n    kg: 4.54\n    percent: 100\n    note: \"Malto base\"\n\nluppolatura:\n  - varieta: \"Styrian Goldings\"\n    grammi: 57\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 57\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3787 (Trappist High Gravity) / WLP530 (Abbey Ale)\"\n  forma: liquido\n  attenuazione_percent: 82\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito trappista, free rise\"\n\nmash:\n  temperatura_c: 63\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 55°C/10, 63°C/40, 70°C/10\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Grist 100% Pilsner\"\n  - \"Luppolatura decisa per finale amaro\"\n\nalternative:\n  - descrizione: \"Versione più maltata\"\n    cambiamenti: \"Aggiungere un tocco di Vienna\"\n    impatto: \"Corpo più pieno\"\n";

//#endregion
//#region src/brewing/recipes/26-trappist/26B-belgian-dubbel.yaml?raw
var _26B_belgian_dubbel_default = "nome: \"Gordon Strong's Belgian Dubbel\"\nstile: \"Belgian Dubbel\"\ncodice_bjcp: \"26B\"\ndescrizione: |\n  Dubbel ambrata e maltata con note di frutta secca e caramello dallo zucchero\n  candito, esteri fruttati e finale secco.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-belgian-dubbel/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.066\n  fg: 1.012\n  abv_percent: 7.0\n  ibu: 22\n  ebc: 34\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Belgian Pilsner malt\"\n    kg: 3.49\n    percent: 42\n    note: \"Malto base\"\n  - malto: \"German Munich malt\"\n    kg: 0.45\n    percent: 5\n    note: \"Corpo maltato\"\n  - malto: \"German dark Munich malt\"\n    kg: 0.91\n    percent: 11\n    note: \"Profondità\"\n  - malto: \"CaraPils malt\"\n    kg: 0.11\n    percent: 1\n    note: \"Schiuma e corpo\"\n  - malto: \"Amber (D-45) candi syrup\"\n    kg: 0.45\n    percent: 5\n    note: \"Attenuazione\"\n  - malto: \"Dark (D-90) candi syrup\"\n    kg: 0.45\n    percent: 5\n    note: \"Caramello scuro\"\n\nluppolatura:\n  - varieta: \"Styrian Goldings\"\n    grammi: 43\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 2\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3787 / WLP530 / Imperial B48 / LalBrew Abbaye\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito trappista, free rise\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Zucchero candito per caramello e attenuazione\"\n  - \"Lievito trappista per esteri fruttati\"\n\nalternative:\n  - descrizione: \"Versione più scura\"\n    cambiamenti: \"Aumentare D-90 candi syrup\"\n    impatto: \"Caramello più scuro\"\n";

//#endregion
//#region src/brewing/recipes/26-trappist/26C-belgian-tripel.yaml?raw
var _26C_belgian_tripel_default = "nome: \"Gordon Strong's Belgian Tripel\"\nstile: \"Belgian Tripel\"\ncodice_bjcp: \"26C\"\ndescrizione: |\n  Tripel dorata, secca e alcolica, con zucchero per attenuazione elevata, esteri\n  fruttati e finale asciutto.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gordon-strongs-belgian-tripel/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.072\n  fg: 1.010\n  abv_percent: 8.3\n  ibu: 34\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 4.08\n    percent: 62\n    note: \"Malto base\"\n  - malto: \"Vienna malt\"\n    kg: 0.45\n    percent: 7\n    note: \"Corpo maltato\"\n  - malto: \"White sugar\"\n    kg: 1.13\n    percent: 17\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Sterling\"\n    grammi: 21\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Amarillo\"\n    grammi: 28\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Styrian Goldings\"\n    grammi: 28\n    tempo_min: 2\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"White Labs WLP510 (Bastogne) / Wyeast 3787 / SafAle T-58\"\n  forma: liquido\n  attenuazione_percent: 84\n  temperatura_fermentazione: \"17°C\"\n  note: \"Lievito trappista, free rise\"\n\nmash:\n  temperatura_c: 63\n  durata_min: 80\n  spessore_l_kg: 3.0\n  note: \"Step: 55°C/10, 60°C/10, 63°C/40, 70°C/20\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Zucchero per attenuazione elevata\"\n  - \"Finale asciutto e alcolico\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre lo zucchero\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/26-trappist/26D-belgian-dark-strong-ale.yaml?raw
var _26D_belgian_dark_strong_ale_default = "nome: \"Gordon Strong's Belgian Dark Strong Ale\"\nstile: \"Belgian Dark Strong Ale\"\ncodice_bjcp: \"26D\"\ndescrizione: |\n  Quad scura, ricca e complessa, con frutta secca, caramello scuro e zucchero\n  candito, alta gradazione e finale secco.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/articles/belgian-dark-strong-ale-a-quad-by-any-other-name/\"\n  autore: \"Gordon Strong\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.091\n  fg: 1.015\n  abv_percent: 10.2\n  ibu: 24\n  ebc: 52\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner malt\"\n    kg: 3.18\n    percent: 31\n    note: \"Malto base\"\n  - malto: \"Pale ale malt\"\n    kg: 1.36\n    percent: 13\n    note: \"Malto base\"\n  - malto: \"Munich malt\"\n    kg: 0.91\n    percent: 9\n    note: \"Corpo maltato\"\n  - malto: \"Dark Munich malt\"\n    kg: 0.91\n    percent: 9\n    note: \"Profondità\"\n  - malto: \"Aromatic malt\"\n    kg: 0.45\n    percent: 4\n    note: \"Aroma maltato\"\n  - malto: \"Crystal malt (40°L)\"\n    kg: 0.45\n    percent: 4\n    note: \"Caramello\"\n  - malto: \"Chocolate malt\"\n    kg: 0.06\n    percent: 1\n    note: \"Colore\"\n  - malto: \"Dark candi syrup\"\n    kg: 0.45\n    percent: 4\n    note: \"Caramello scuro\"\n  - malto: \"Amber (brown) sugar\"\n    kg: 0.45\n    percent: 4\n    note: \"Attenuazione\"\n\nluppolatura:\n  - varieta: \"Saaz\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Styrian Goldings\"\n    grammi: 28\n    tempo_min: 10\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"Saaz\"\n    grammi: 14\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3787 (Trappist High Gravity) / WLP500 / LalBrew Abbaye\"\n  forma: liquido\n  attenuazione_percent: 82\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito trappista, free rise\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Step: 62°C/45, 70°C/15\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.6\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Zucchero candito per caramello scuro e attenuazione\"\n  - \"Alta gradazione, pitch rate elevato\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.080\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/27-historical/27A-grodziskie.yaml?raw
var _27A_grodziskie_default = "nome: \"Piwo Grodziskie Oryginalne\"\nstile: \"Grodziskie (Grätzer)\"\ncodice_bjcp: \"27A\"\ndescrizione: |\n  Birra chiara, secca e amara (28 IBU su soli 3.1% ABV), con strati di fumo da\n  falò e delicato aroma di luppolo nobile; fermentazione pulita per non coprire\n  il fumo. Soprannominata \"champagne polacco\" per l'altissima effervescenza.\n\nfonte:\n  nome: \"Craft Beer & Brewing Magazine\"\n  url: \"https://beerandbrewing.com/recipe-piwo-grodziskie-oryginalne\"\n  autore: \"Marcin Ostajewski (Browar Grodzisk)\"\n  verifica: \"Ricetta pubblicata da Craft Beer & Brewing, fonte autorevole. Quantità esatte grist/luppoli dietro paywall; composizione 100% frumento affumicato verificata dall'articolo correlato.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.031\n  fg: 1.007\n  abv_percent: 3.1\n  ibu: 28\n  ebc: 5\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Malto di frumento affumicato (oak-smoked wheat malt)\"\n    kg: 4.0\n    percent: 100\n    note: \"Frumento affumicato\"\n\nluppolatura:\n  - varieta: \"Tomyski / Lubelski (Lublin)\"\n    grammi: 30\n    tempo_min: 60\n    uso: boil\n    note: \"Luppoli nobili erbacei\"\n\nlievito:\n  ceppo: \"White Labs WLP548 (ceppo originale di Grodzisk) o lievito lager neutro\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"12°C\"\n  note: \"Fermentazione fredda\"\n\nmash:\n  temperatura_c: 65\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Decozione opzionale\"\n\nbollitura:\n  durata_min: 90\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 12\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 3.8\n  temperatura_servizio_c: 4\n\nnote_critiche:\n  - \"Carbonazione molto alta (3.5-4 vol CO2)\"\n  - \"Fermentazione pulita per non coprire il fumo\"\n\nalternative:\n  - descrizione: \"Versione meno affumicata\"\n    cambiamenti: \"Mescolare con frumento non affumicato\"\n    impatto: \"Fumo più contenuto\"\n";

//#endregion
//#region src/brewing/recipes/27-historical/27B-lichtenhainer.yaml?raw
var _27B_lichtenhainer_default = "nome: \"Smoky Grove Lichtenhainer\"\nstile: \"Lichtenhainer\"\ncodice_bjcp: \"27B\"\ndescrizione: |\n  Birra di frumento affumicata, leggera e leggermente acidula, con parti uguali\n  di pilsner, Vienna e malto di frumento affumicato alla quercia. Da consumare\n  giovane, con acidità moderata data dal Lactobacillus.\n\nfonte:\n  nome: \"Craft Beer & Brewing Magazine\"\n  url: \"https://www.beerandbrewing.com/recipe-smoky-grove-lichtenhainer/\"\n  autore: \"Josh Weikert\"\n  verifica: \"Ricetta pubblicata da Craft Beer & Brewing, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.040\n  fg: 1.009\n  abv_percent: 3.9\n  ibu: 9\n  ebc: 10\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Pilsner\"\n    kg: 1.13\n    percent: 33.3\n    note: \"Malto base\"\n  - malto: \"Vienna\"\n    kg: 1.13\n    percent: 33.3\n    note: \"Corpo maltato\"\n  - malto: \"Oak-smoked wheat malt\"\n    kg: 1.13\n    percent: 33.3\n    note: \"Frumento affumicato\"\n\nluppolatura:\n  - varieta: \"Hallertauer Mittelfrüh\"\n    grammi: 28\n    tempo_min: 15\n    uso: boil\n    note: \"Amaro (9 IBU)\"\n\nlievito:\n  ceppo: \"Wyeast 1007 (German Ale) + Wyeast 5335 (Lactobacillus)\"\n  forma: liquido\n  attenuazione_percent: 78\n  temperatura_fermentazione: \"20°C\"\n  note: \"Co-pitch con Lactobacillus per acidità moderata\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Acidità moderata da Lactobacillus\"\n  - \"Da consumare giovane\"\n\nalternative:\n  - descrizione: \"Versione più acida\"\n    cambiamenti: \"Aumentare il tempo di acidificazione\"\n    impatto: \"Acidità più marcata\"\n";

//#endregion
//#region src/brewing/recipes/27-historical/27C-roggenbier.yaml?raw
var _27C_roggenbier_default = "nome: \"JC's Roggenbier\"\nstile: \"Roggenbier\"\ncodice_bjcp: \"27C\"\ndescrizione: |\n  Roggenbier equilibrata sul modello della Schierlinger originale, con segale\n  speziata, corpo da weizen e note di banana/chiodi di garofano dal lievito\n  weizen; finitura secca e pulita.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/jcs-roggenbier/\"\n  autore: \"Jamil Zainasheff\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.054\n  fg: 1.014\n  abv_percent: 5.3\n  ibu: 17\n  ebc: 32\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Malto di segale (rye malt, 3.5°L)\"\n    kg: 2.72\n    percent: 47.8\n    note: \"Segale\"\n  - malto: \"Pilsner malt (1.8°L)\"\n    kg: 1.25\n    percent: 22.0\n    note: \"Malto base\"\n  - malto: \"Munich malt (8°L)\"\n    kg: 1.25\n    percent: 22.0\n    note: \"Corpo maltato\"\n  - malto: \"CaraMunich (60°L)\"\n    kg: 0.41\n    percent: 7.2\n    note: \"Caramello\"\n  - malto: \"Carafa Special II (430°L, huskless)\"\n    kg: 0.06\n    percent: 1.0\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Tettnang\"\n    grammi: 24\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Czech Saaz\"\n    grammi: 7\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 3068 (Weihenstephan Weizen) / White Labs WLP300\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"17°C\"\n  note: \"Lievito weizen\"\n\nmash:\n  temperatura_c: 68\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion fino a conversione completa, mashout 76°C\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 17\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.8\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Segale speziata\"\n  - \"Lievito weizen per banana/chiodi di garofano\"\n\nalternative:\n  - descrizione: \"Versione più speziata\"\n    cambiamenti: \"Aumentare la segale a 55%\"\n    impatto: \"Speziatura più marcata\"\n";

//#endregion
//#region src/brewing/recipes/28-american-wild/28A-brett-beer.yaml?raw
var _28A_brett_beer_default = "nome: \"Pizza Port Brewing Co.'s Mo' Betta Bretta clone\"\nstile: \"Brett Beer\"\ncodice_bjcp: \"28A\"\ndescrizione: |\n  Golden ale fermentata al 100% con Brettanomyces, pulita e funky, con corpo da\n  fiocchi d'avena e bassa amarezza (12 IBU) che lascia spazio al carattere del\n  lievito selvatico.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/pizza-port-brewing-co-s-mo-betta-bretta-clone/\"\n  autore: \"Tomme Arthur (Pizza Port)\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.060\n  fg: 1.011\n  abv_percent: 6.3\n  ibu: 12\n  ebc: 14\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 4.44\n    percent: 76.3\n    note: \"Malto base\"\n  - malto: \"Munich malt (10°L)\"\n    kg: 0.49\n    percent: 8.4\n    note: \"Corpo maltato\"\n  - malto: \"Carapils malt\"\n    kg: 0.44\n    percent: 7.6\n    note: \"Schiuma e corpo\"\n  - malto: \"Flaked oats\"\n    kg: 0.44\n    percent: 7.6\n    note: \"Corpo morbido\"\n\nluppolatura:\n  - varieta: \"Magnum\"\n    grammi: 5.7\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Brettanomyces anomalus (da bottiglia) / White Labs WLP645 (B. claussenii)\"\n  forma: liquido\n  attenuazione_percent: 80\n  temperatura_fermentazione: \"20°C\"\n  note: \"Starter da ~4L, condizionamento almeno 4 settimane\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 14\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Condizionamento almeno 4 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"100% Brettanomyces\"\n  - \"Bassa amarezza per lasciare spazio al lievito\"\n\nalternative:\n  - descrizione: \"Versione più funky\"\n    cambiamenti: \"Aumentare il tempo di condizionamento\"\n    impatto: \"Carattere Brett più marcato\"\n";

//#endregion
//#region src/brewing/recipes/29-fruit-beer/29A-fruit-beer.yaml?raw
var _29A_fruit_beer_default = "nome: \"Apricot American Wheat (All-Grain)\"\nstile: \"Fruit Beer (American Wheat con albicocca)\"\ncodice_bjcp: \"29A\"\ndescrizione: |\n  American wheat ale di base pulita e leggera, con l'albicocca che emerge in\n  primo piano grazie all'estratto aggiunto a fine fermentazione. Base versatile:\n  l'autore suggerisce che anche la pesca funziona altrettanto bene.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/apricot-american-wheat-all-grain/\"\n  autore: \"Gordon Strong (ricetta di Todd Donnelly)\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.051\n  fg: 1.013\n  abv_percent: 5.0\n  ibu: 19\n  ebc: 8\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Wheat malt\"\n    kg: 2.72\n    percent: 54.5\n    note: \"Frumento\"\n  - malto: \"2-row pale malt\"\n    kg: 1.81\n    percent: 36.4\n    note: \"Malto base\"\n  - malto: \"Munich malt\"\n    kg: 0.45\n    percent: 9.1\n    note: \"Corpo maltato\"\n\nluppolatura:\n  - varieta: \"Willamette\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Hallertauer\"\n    grammi: 14\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1056 / White Labs WLP001 / SafAle US-05\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale americano pulito\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 2\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Estratto di albicocca Amoretti 3mL aggiunto al racking, prima dell'imbottigliamento\"\n  - \"Base versatile, funziona anche con pesca\"\n\nalternative:\n  - descrizione: \"Versione con pesca\"\n    cambiamenti: \"Sostituire l'estratto di albicocca con pesca\"\n    impatto: \"Sapore di pesca\"\n";

//#endregion
//#region src/brewing/recipes/30-spice-herb-vegetable/30A-spice-herb-vegetable.yaml?raw
var _30A_spice_herb_vegetable_default = "nome: \"Wee Hottie\"\nstile: \"Spice, Herb or Vegetable Beer (Wee Heavy con peperoncini)\"\ncodice_bjcp: \"30A\"\ndescrizione: |\n  Una wee heavy scura e maltata (Maris Otter + rauch affumicato) che funge da\n  base robusta per il calore intenso di 80 peperoncini. Il corpo pieno e la\n  dolcezza residua bilanciano il piccante dei chipotle e serrano.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/wee-hottie/\"\n  autore: \"BYO Staff (ricetta di Kuyler Doyle)\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.073\n  fg: 1.025\n  abv_percent: 6.2\n  ibu: 20\n  ebc: 49\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Maris Otter malt\"\n    kg: 5.22\n    percent: 76.7\n    note: \"Malto base\"\n  - malto: \"Smoked rauch malt\"\n    kg: 0.45\n    percent: 6.7\n    note: \"Affumicato\"\n  - malto: \"British CaraPils malt\"\n    kg: 0.45\n    percent: 6.7\n    note: \"Schiuma e corpo\"\n  - malto: \"Belgian aromatic\"\n    kg: 0.23\n    percent: 3.3\n    note: \"Aroma maltato\"\n  - malto: \"Belgian CaraVienne\"\n    kg: 0.23\n    percent: 3.3\n    note: \"Caramello\"\n  - malto: \"British medium crystal\"\n    kg: 0.11\n    percent: 1.7\n    note: \"Caramello\"\n  - malto: \"British chocolate malt\"\n    kg: 0.11\n    percent: 1.7\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"U.K. Target\"\n    grammi: 14\n    tempo_min: 75\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"U.K. Fuggles\"\n    grammi: 7\n    tempo_min: 15\n    uso: boil\n    note: \"Aroma\"\n  - varieta: \"U.K. Fuggles\"\n    grammi: 7\n    tempo_min: 0\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1728 (Scottish Ale)\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"16°C\"\n  note: \"Lievito scozzese\"\n\nmash:\n  temperatura_c: 70\n  durata_min: 90\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 75\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 16\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"40 chipotle + 40 serrano, privati dei semi e affettati, aggiunti al secondary\"\n  - \"Corpo pieno e dolcezza residua bilanciano il piccante\"\n\nalternative:\n  - descrizione: \"Versione meno piccante\"\n    cambiamenti: \"Ridurre i peperoncini a 40 totali\"\n    impatto: \"Piccante più contenuto\"\n";

//#endregion
//#region src/brewing/recipes/31-alternative-grain/31A-alternative-grain.yaml?raw
var _31A_alternative_grain_default = "nome: \"Gluten-Free Pale Ale\"\nstile: \"Alternative Grain Beer (gluten-free)\"\ncodice_bjcp: \"31A\"\ndescrizione: |\n  Pale ale gluten-free a base di miglio, riso e grano saraceno, con luppolo\n  Cascade per esaltare i fenoli naturali del sorgo/miglio. Ricetta collaudata,\n  ottimo punto di partenza per la birra senza glutine.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/gluten-free-pale-ale/\"\n  autore: \"Robert Keifer\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 21\n  og: 1.058\n  fg: 1.012\n  abv_percent: 6.0\n  ibu: 36\n  ebc: 14\n  efficienza_percent: 75\n  impianto: \"All grain 21L\"\n  volume_fermentatore: 21\n\ngrist:\n  - malto: \"Pale millet malt\"\n    kg: 4.1\n    percent: 64.5\n    note: \"Miglio\"\n  - malto: \"CaraMillet malt (3°L)\"\n    kg: 0.9\n    percent: 14.2\n    note: \"Caramello\"\n  - malto: \"Biscuit rice malt\"\n    kg: 0.68\n    percent: 10.7\n    note: \"Riso\"\n  - malto: \"Pale buckwheat malt\"\n    kg: 0.45\n    percent: 7.1\n    note: \"Grano saraceno\"\n  - malto: \"Crystal rice malt\"\n    kg: 0.23\n    percent: 3.6\n    note: \"Caramello\"\n\nluppolatura:\n  - varieta: \"Cascade (5% AA)\"\n    grammi: 28\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Cryo Cascade\"\n    grammi: 28\n    tempo_min: 0\n    uso: whirlpool\n  - varieta: \"Cascade\"\n    grammi: 28\n    tempo_min: 0\n    uso: dry_hop\n    note: \"Dry hop\"\n\nlievito:\n  ceppo: \"SafAle S-04 / Mangrove Jack's M15 (Empire Ale)\"\n  forma: secco\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 105\n  spessore_l_kg: 3.0\n  note: \"90-120 min fino a test iodio, si può salire a 71°C dopo 1h\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 26\n  volume_post_boil_litri: 21\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 20\n  dry_hop_giorno: 5\n  dry_hop_temperatura_c: 20\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.5\n  temperatura_servizio_c: 5\n\nnote_critiche:\n  - \"Maltodestrina 0.45kg a 15 min\"\n  - \"Enzimi Termamyl + SEBamyl L in mash per conversione dei grani non-maltati\"\n\nalternative:\n  - descrizione: \"Versione più luppolata\"\n    cambiamenti: \"Aggiungere dry hop aggiuntivo\"\n    impatto: \"Aroma più intenso\"\n";

//#endregion
//#region src/brewing/recipes/32-smoked/32A-smoked-porter.yaml?raw
var _32A_smoked_porter_default = "nome: \"Vermont Pub and Brewery's Smoked Porter (clone)\"\nstile: \"Classic Style Smoked Beer (smoked porter)\"\ncodice_bjcp: \"32A\"\ndescrizione: |\n  Clone della smoked porter della Vermont Pub & Brewery, che affumica i propri\n  malti su legno di mela, acero e hickory. Robust ale scura con 47 IBU.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/smoked-porter/\"\n  autore: \"Scott Russell\"\n  verifica: \"Clone commerciale pubblicato da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.055\n  fg: 1.016\n  abv_percent: 5.7\n  ibu: 47\n  ebc: 66\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 4.0\n    percent: 74.5\n    note: \"Malto base\"\n  - malto: \"Smoked malt\"\n    kg: 0.91\n    percent: 16.9\n    note: \"Affumicato\"\n  - malto: \"Black patent malt\"\n    kg: 0.23\n    percent: 4.3\n    note: \"Colore\"\n  - malto: \"Chocolate malt\"\n    kg: 0.23\n    percent: 4.3\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Chinook (12% AA)\"\n    grammi: 28\n    tempo_min: 65\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Golding (4% AA)\"\n    grammi: 21\n    tempo_min: 5\n    uso: boil\n    note: \"Aroma\"\n\nlievito:\n  ceppo: \"Wyeast 1098 (British Ale) / White Labs WLP007 (Dry English Ale)\"\n  forma: liquido\n  attenuazione_percent: 74\n  temperatura_fermentazione: \"18°C\"\n  note: \"Lievito ale inglese, conditioning 3 settimane a 13°C\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 65\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 10\n  temperatura_c: 18\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Conditioning 3 settimane a 13°C\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Malti affumicati su mela/acero/hickory\"\n  - \"Amaro deciso (47 IBU)\"\n\nalternative:\n  - descrizione: \"Versione più affumicata\"\n    cambiamenti: \"Aumentare smoked malt a 25%\"\n    impatto: \"Fumo più intenso\"\n";

//#endregion
//#region src/brewing/recipes/33-wood-aged/33A-wood-aged.yaml?raw
var _33A_wood_aged_default = "nome: \"Abysmal Stout (Bourbon 'Barrel' Aged)\"\nstile: \"Wood-Aged Beer (imperial stout su quercia/bourbon)\"\ncodice_bjcp: \"33A\"\ndescrizione: |\n  Imperial stout ad alta gravità che ottiene il carattere di legno da cubetti di\n  quercia carbonizzati imbevuti in bourbon o rye, aggiunti in secondario.\n  Invecchiamento di almeno 2 mesi per fondere legno e alcol.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/abysmal-stout-bourbon-barrel-aged/\"\n  autore: \"Andrew Reudink\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.096\n  fg: 1.020\n  abv_percent: 11.5\n  ibu: 40\n  ebc: 132\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"Golden Promise malt\"\n    kg: 6.8\n    percent: 76.0\n    note: \"Malto base\"\n  - malto: \"Kiln coffee malt (150°L)\"\n    kg: 0.68\n    percent: 7.6\n    note: \"Tostatura\"\n  - malto: \"Briess Midnight Wheat malt\"\n    kg: 0.45\n    percent: 5.0\n    note: \"Colore\"\n  - malto: \"Crystal rye malt (75°L)\"\n    kg: 0.45\n    percent: 5.0\n    note: \"Caramello\"\n  - malto: \"Crystal malt (60°L)\"\n    kg: 0.34\n    percent: 3.8\n    note: \"Caramello\"\n  - malto: \"Victory malt\"\n    kg: 0.23\n    percent: 2.6\n    note: \"Tostatura\"\n\nluppolatura:\n  - varieta: \"Nugget (13% AA)\"\n    grammi: 14\n    tempo_min: 60\n    uso: boil\n    note: \"Amaro\"\n  - varieta: \"Nugget (13% AA)\"\n    grammi: 14\n    tempo_min: 30\n    uso: boil\n    note: \"Amaro\"\n\nlievito:\n  ceppo: \"Wyeast 1084 (Irish Ale) / Lallemand Nottingham\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito ale\"\n\nmash:\n  temperatura_c: 66\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 21\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Cubetti di quercia carbonizzati imbevuti in bourbon/rye (57g) in secondario 3-4 settimane\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.3\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Extra dark candi syrup 0.9kg in fermentazione primaria\"\n  - \"Licorice root 28g a 15 min, vanilla bean 1 in primaria\"\n  - \"Cubetti di quercia carbonizzati in secondario, invecchiamento minimo 2 mesi\"\n\nalternative:\n  - descrizione: \"Versione meno alcolica\"\n    cambiamenti: \"Ridurre OG a 1.085\"\n    impatto: \"Meno alcolica\"\n";

//#endregion
//#region src/brewing/recipes/34-specialty/34C-experimental.yaml?raw
var _34C_experimental_default = "nome: \"Rastaman Stout (basata su Dogfish Head Bitches Brew)\"\nstile: \"Experimental Beer (imperial stout × T'ej etiope)\"\ncodice_bjcp: \"34C\"\ndescrizione: |\n  Birra sperimentale che fonde imperial stout e T'ej etiope: grano saraceno\n  maltato, miele e sciroppo di sorgo, con foglie e steli di Gesho al posto dei\n  luppoli tradizionali. Lievito da idromele per un profilo dolce e complesso.\n\nfonte:\n  nome: \"Brew Your Own (BYO) magazine\"\n  url: \"https://byo.com/recipes/rastaman-stout/\"\n  autore: \"Robert Archibald\"\n  verifica: \"Ricetta pubblicata da BYO, fonte autorevole. Non verificata come premiata.\"\n\nparametri:\n  batch_size_litri: 19\n  og: 1.088\n  fg: 1.024\n  abv_percent: 8.6\n  ibu: 40\n  ebc: 116\n  efficienza_percent: 75\n  impianto: \"All grain 19L\"\n  volume_fermentatore: 19\n\ngrist:\n  - malto: \"2-row pale malt\"\n    kg: 2.3\n    percent: 38.8\n    note: \"Malto base\"\n  - malto: \"Malted buckwheat\"\n    kg: 1.8\n    percent: 30.4\n    note: \"Grano saraceno maltato\"\n  - malto: \"Crystal malt (120°L)\"\n    kg: 0.91\n    percent: 15.3\n    note: \"Caramello\"\n  - malto: \"Black patent malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Colore\"\n  - malto: \"Chocolate malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Tostatura\"\n  - malto: \"Roasted barley\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Tostatura\"\n  - malto: \"Briess Midnight Wheat malt\"\n    kg: 0.23\n    percent: 3.9\n    note: \"Colore\"\n\nluppolatura:\n  - varieta: \"Gesho Kitel (foglie di luppolo etiope)\"\n    grammi: 250\n    tempo_min: 15\n    uso: boil\n    note: \"Amaricante tradizionale etiope\"\n  - varieta: \"Gesho Entchet (steli etiopi)\"\n    grammi: 227\n    tempo_min: 0\n    uso: dry_hop\n    note: \"In secondario 14 giorni\"\n\nlievito:\n  ceppo: \"White Labs WLP720 (Sweet Mead) / Wyeast 4184 (Sweet Mead)\"\n  forma: liquido\n  attenuazione_percent: 76\n  temperatura_fermentazione: \"20°C\"\n  note: \"Lievito da idromele\"\n\nmash:\n  temperatura_c: 67\n  durata_min: 60\n  spessore_l_kg: 3.0\n  note: \"Single infusion, enzima amilasi 1 tsp in mash\"\n\nbollitura:\n  durata_min: 60\n  volume_pre_boil_litri: 24\n  volume_post_boil_litri: 19\n\nfermentazione:\n  primaria_giorni: 7\n  temperatura_c: 20\n  cold_crash: true\n  cold_crash_giorni: 3\n  cold_crash_temp_c: 2\n  note: \"Secondaria 14 giorni su Gesho Entchet\"\n\ncarbonazione:\n  metodo: bottiglia\n  zucchero_tipo: saccarosio\n  co2_volumi: 2.4\n  temperatura_servizio_c: 6\n\nnote_critiche:\n  - \"Miele 1.4kg e sciroppo di sorgo 1.4kg in bollitura\"\n  - \"Gesho al posto dei luppoli tradizionali\"\n  - \"Lievito da idromele per profilo dolce\"\n\nalternative:\n  - descrizione: \"Versione meno dolce\"\n    cambiamenti: \"Ridurre miele e sorgo\"\n    impatto: \"Finale più secco\"\n";

//#endregion
//#region src/brewing/reference-recipes.ts
/**
* Reference recipe library — the curated BJCP reference recipes, bundled into
* the package via `?raw` imports so they are available at runtime in both dev
* and production builds.
*
* Every recipe is a real, published recipe sourced from a recognized reference
* (BYO, Craft Beer & Brewing, AHA, malt/yeast producers, established authors).
* Each carries a `fonte` (source) block with a URL and a verification status.
* Nothing here is invented.
*/
const RAW_RECIPES = [
	{
		code: "1A",
		raw: _1A_american_light_lager_default
	},
	{
		code: "1B",
		raw: _1B_american_lager_default
	},
	{
		code: "1C",
		raw: _1C_cream_ale_default
	},
	{
		code: "1D",
		raw: _1D_american_wheat_default
	},
	{
		code: "2A",
		raw: _2A_international_pale_lager_default
	},
	{
		code: "2B",
		raw: _2B_international_amber_lager_default
	},
	{
		code: "2C",
		raw: _2C_international_dark_lager_default
	},
	{
		code: "3A",
		raw: _3A_czech_pale_lager_default
	},
	{
		code: "3B",
		raw: _3B_czech_premium_pale_lager_default
	},
	{
		code: "3C",
		raw: _3C_czech_amber_lager_default
	},
	{
		code: "3D",
		raw: _3D_czech_dark_lager_default
	},
	{
		code: "4A",
		raw: _4A_munich_helles_default
	},
	{
		code: "4B",
		raw: _4B_festbier_default
	},
	{
		code: "4C",
		raw: _4C_helles_bock_default
	},
	{
		code: "5A",
		raw: _5A_german_leichtbier_default
	},
	{
		code: "5B",
		raw: _5B_kolsch_default
	},
	{
		code: "5C",
		raw: _5C_german_helles_exportbier_default
	},
	{
		code: "5D",
		raw: _5D_german_pils_default
	},
	{
		code: "6A",
		raw: _6A_marzen_default
	},
	{
		code: "6B",
		raw: _6B_rauchbier_default
	},
	{
		code: "6C",
		raw: _6C_dunkels_bock_default
	},
	{
		code: "7A",
		raw: _7A_vienna_lager_default
	},
	{
		code: "7B",
		raw: _7B_altbier_default
	},
	{
		code: "7C",
		raw: _7C_kellerbier_default
	},
	{
		code: "8A",
		raw: _8A_munich_dunkel_default
	},
	{
		code: "8B",
		raw: _8B_schwarzbier_default
	},
	{
		code: "9A",
		raw: _9A_doppelbock_default
	},
	{
		code: "9B",
		raw: _9B_eisbock_default
	},
	{
		code: "9C",
		raw: _9C_baltic_porter_default
	},
	{
		code: "10A",
		raw: _10A_weissbier_default
	},
	{
		code: "10B",
		raw: _10B_dunkles_weissbier_default
	},
	{
		code: "10C",
		raw: _10C_weizenbock_default
	},
	{
		code: "11A",
		raw: _11A_ordinary_bitter_default
	},
	{
		code: "11B",
		raw: _11B_best_bitter_default
	},
	{
		code: "11C",
		raw: _11C_strong_bitter_default
	},
	{
		code: "12A",
		raw: _12A_british_golden_ale_default
	},
	{
		code: "12B",
		raw: _12B_australian_sparkling_ale_default
	},
	{
		code: "12C",
		raw: _12C_english_ipa_default
	},
	{
		code: "13A",
		raw: _13A_dark_mild_default
	},
	{
		code: "13B",
		raw: _13B_british_brown_ale_default
	},
	{
		code: "13C",
		raw: _13C_english_porter_default
	},
	{
		code: "14A",
		raw: _14A_scottish_light_default
	},
	{
		code: "14B",
		raw: _14B_scottish_heavy_default
	},
	{
		code: "14C",
		raw: _14C_scottish_export_default
	},
	{
		code: "15A",
		raw: _15A_irish_red_ale_default
	},
	{
		code: "15B",
		raw: _15B_irish_stout_default
	},
	{
		code: "15C",
		raw: _15C_irish_extra_stout_default
	},
	{
		code: "16A",
		raw: _16A_sweet_stout_default
	},
	{
		code: "16B",
		raw: _16B_oatmeal_stout_default
	},
	{
		code: "16C",
		raw: _16C_tropical_stout_default
	},
	{
		code: "16D",
		raw: _16D_foreign_extra_stout_default
	},
	{
		code: "17A",
		raw: _17A_british_strong_ale_default
	},
	{
		code: "17B",
		raw: _17B_old_ale_default
	},
	{
		code: "17C",
		raw: _17C_wee_heavy_default
	},
	{
		code: "17D",
		raw: _17D_english_barleywine_default
	},
	{
		code: "18A",
		raw: _18A_blonde_ale_default
	},
	{
		code: "18B",
		raw: _18B_american_pale_ale_default
	},
	{
		code: "19A",
		raw: _19A_american_amber_ale_default
	},
	{
		code: "19B",
		raw: _19B_california_common_default
	},
	{
		code: "19C",
		raw: _19C_american_brown_ale_default
	},
	{
		code: "20A",
		raw: _20A_american_porter_default
	},
	{
		code: "20B",
		raw: _20B_american_stout_default
	},
	{
		code: "20C",
		raw: _20C_imperial_stout_default
	},
	{
		code: "21A",
		raw: _21A_american_ipa_default
	},
	{
		code: "21B",
		raw: _21B_specialty_ipa_black_ipa_default
	},
	{
		code: "21B1",
		raw: _21B1_new_england_ipa_default
	},
	{
		code: "21C",
		raw: _21C_hazy_ipa_default
	},
	{
		code: "22A",
		raw: _22A_double_ipa_default
	},
	{
		code: "22B",
		raw: _22B_american_strong_ale_default
	},
	{
		code: "22C",
		raw: _22C_american_barleywine_default
	},
	{
		code: "22D",
		raw: _22D_wheatwine_default
	},
	{
		code: "23A",
		raw: _23A_berliner_weisse_default
	},
	{
		code: "23B",
		raw: _23B_flanders_red_ale_default
	},
	{
		code: "23C",
		raw: _23C_oud_bruin_default
	},
	{
		code: "23D",
		raw: _23D_lambic_default
	},
	{
		code: "23E",
		raw: _23E_gueuze_default
	},
	{
		code: "23F",
		raw: _23F_fruit_lambic_default
	},
	{
		code: "23G",
		raw: _23G_gose_default
	},
	{
		code: "24A",
		raw: _24A_witbier_default
	},
	{
		code: "24B",
		raw: _24B_belgian_pale_ale_default
	},
	{
		code: "24C",
		raw: _24C_biere_de_garde_default
	},
	{
		code: "25A",
		raw: _25A_belgian_blond_ale_default
	},
	{
		code: "25B",
		raw: _25B_saison_default
	},
	{
		code: "25C",
		raw: _25C_belgian_golden_strong_ale_default
	},
	{
		code: "26A",
		raw: _26A_trappist_single_default
	},
	{
		code: "26B",
		raw: _26B_belgian_dubbel_default
	},
	{
		code: "26C",
		raw: _26C_belgian_tripel_default
	},
	{
		code: "26D",
		raw: _26D_belgian_dark_strong_ale_default
	},
	{
		code: "27A",
		raw: _27A_grodziskie_default
	},
	{
		code: "27B",
		raw: _27B_lichtenhainer_default
	},
	{
		code: "27C",
		raw: _27C_roggenbier_default
	},
	{
		code: "28A",
		raw: _28A_brett_beer_default
	},
	{
		code: "29A",
		raw: _29A_fruit_beer_default
	},
	{
		code: "30A",
		raw: _30A_spice_herb_vegetable_default
	},
	{
		code: "31A",
		raw: _31A_alternative_grain_default
	},
	{
		code: "32A",
		raw: _32A_smoked_porter_default
	},
	{
		code: "33A",
		raw: _33A_wood_aged_default
	},
	{
		code: "34C",
		raw: _34C_experimental_default
	}
];
/**
* All reference recipes, parsed from the bundled raw YAML.
* Parsing is lazy and cached.
*/
let _parsed = null;
function getAllReferenceRecipes() {
	if (_parsed) return _parsed;
	_parsed = RAW_RECIPES.map(({ code, raw }) => {
		return {
			code,
			data: load(raw)
		};
	});
	return _parsed;
}

//#endregion
//#region src/brewing/reference-recipe-search.ts
/**
* Reference recipe search tool — searches the curated BJCP reference recipe
* library for a beer style.
*
* The reference library is bundled into the package (see `reference-recipes.ts`)
* and contains only recipes sourced from recognized public references
* (AHA, BYO, Craft Beer & Brewing, malt/yeast producers, established authors).
* Every recipe carries a `fonte` (source) block with a URL and a verification
* status so the agent can trust it as a style reference without inventing data.
*
* Supports lookup by BJCP style code (e.g. "21A"), style name, or free keyword.
*/
const ReferenceRecipeSearchInputSchema = object({
	stile: string().describe("BJCP style code (e.g. \"21A\"), style name (e.g. \"American IPA\"), or keyword (e.g. \"stout\", \"weizen\")."),
	categoria: string().optional().describe("Optional BJCP category number (e.g. \"21\") to narrow the search."),
	dettaglio: boolean().default(false).describe("When true, returns the full recipe details (grist, hops, yeast, mash, fermentation). Default false (summary only).")
});
function parseReferenceRecipe(recipe) {
	const d = recipe.data;
	const params = d["parametri"];
	const fonte = d["fonte"];
	if (typeof d["nome"] !== "string" || typeof d["stile"] !== "string" || typeof params !== "object" || params === null || typeof fonte !== "object" || fonte === null || typeof fonte["url"] !== "string") return null;
	return {
		nome: String(d["nome"]),
		stile: String(d["stile"]),
		codice_bjcp: String(d["codice_bjcp"] ?? recipe.code),
		fonte: {
			nome: String(fonte["nome"] ?? ""),
			url: String(fonte["url"] ?? ""),
			autore: fonte["autore"] ? String(fonte["autore"]) : void 0,
			verifica: String(fonte["verifica"] ?? "")
		},
		parametri: {
			batch_size_litri: typeof params["batch_size_litri"] === "number" ? params["batch_size_litri"] : void 0,
			og: typeof params["og"] === "number" ? params["og"] : void 0,
			fg: typeof params["fg"] === "number" ? params["fg"] : void 0,
			abv_percent: typeof params["abv_percent"] === "number" ? params["abv_percent"] : void 0,
			ibu: typeof params["ibu"] === "number" ? params["ibu"] : void 0,
			ebc: typeof params["ebc"] === "number" ? params["ebc"] : void 0
		},
		data: d
	};
}
function normalize(q) {
	return q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function recipeMatches(recipe, query, categoria) {
	const q = normalize(query);
	if (!q) return true;
	const code = recipe.codice_bjcp.toLowerCase();
	if (code === q || code.replace(/\s/g, "") === q.replace(/\s/g, "")) return true;
	if (normalize(`${recipe.stile} ${recipe.nome} ${recipe.codice_bjcp}`).includes(q)) return true;
	if (categoria && recipe.codice_bjcp.startsWith(categoria)) return true;
	return false;
}
function formatSummary(r) {
	const p = r.parametri;
	const parts = [];
	parts.push(`**${r.nome}** — ${r.stile}${r.codice_bjcp ? ` (${r.codice_bjcp})` : ""}`);
	if (p.og) parts.push(`OG ${p.og.toFixed(3)}`);
	if (p.fg) parts.push(`FG ${p.fg.toFixed(3)}`);
	if (p.abv_percent) parts.push(`ABV ${p.abv_percent}%`);
	if (p.ibu) parts.push(`IBU ${p.ibu}`);
	if (p.ebc) parts.push(`EBC ${p.ebc}`);
	if (p.batch_size_litri) parts.push(`Batch ${p.batch_size_litri}L`);
	const header = parts.join(" | ");
	const src = r.fonte;
	return `${header}\n  ${`📚 Fonte: ${src.nome}${src.autore ? ` (${src.autore})` : ""} — ${src.url}`}\n  ${`🔎 Verifica: ${src.verifica}`}`;
}
function formatFull(r) {
	const lines = [formatSummary(r), ""];
	const d = r.data;
	const desc = d["descrizione"];
	if (typeof desc === "string") lines.push(`📝 ${desc}`, "");
	const grist = d["grist"];
	if (Array.isArray(grist)) {
		lines.push("🌾 **Grist:**");
		for (const g of grist) lines.push(`  - ${g["malto"]} ${g["kg"]}kg${g["percent"] ? ` (${g["percent"]}%)` : ""}`);
		lines.push("");
	}
	const hops = d["luppolatura"];
	if (Array.isArray(hops)) {
		lines.push("🌿 **Luppolatura:**");
		for (const h of hops) lines.push(`  - ${h["varieta"]} ${h["grammi"]}g @ ${h["tempo_min"]}min (${h["uso"]})`);
		lines.push("");
	}
	const yeast = d["lievito"];
	if (yeast && typeof yeast === "object") {
		const y = yeast;
		lines.push(`🧫 **Lievito:** ${y["ceppo"] ?? ""}${y["forma"] ? ` (${y["forma"]})` : ""}`);
		lines.push("");
	}
	const mash = d["mash"];
	if (mash && typeof mash === "object") {
		const m = mash;
		lines.push(`♨️ **Mash:** ${m["temperatura_c"] ?? ""}°C per ${m["durata_min"] ?? ""}min`);
		lines.push("");
	}
	const ferment = d["fermentazione"];
	if (ferment && typeof ferment === "object") {
		const f = ferment;
		lines.push(`🍺 **Fermentazione:** ${f["temperatura_c"] ?? ""}°C, ${f["primaria_giorni"] ?? ""} giorni`);
		lines.push("");
	}
	return lines.join("\n");
}
var ReferenceRecipeSearchTool = class {
	name = "reference_recipe_search";
	description = "Cerca nella libreria di ricette brassicole di riferimento (BJCP) una ricetta per stile. La libreria contiene solo ricette reali provenienti da fonti riconosciute (AHA, BYO, Craft Beer & Brewing, produttori di malti/lieviti, autori affermati), ognuna con fonte e link verificabile. Usa questo tool quando ti viene chiesto un riferimento certo per uno stile di birra. Cerca per codice BJCP (es. \"21A\"), nome stile (es. \"American IPA\") o parola chiave (es. \"stout\").";
	parameters = toInputJsonSchema(ReferenceRecipeSearchInputSchema);
	resolveExecution(args) {
		return {
			description: `Reference recipe search for "${args.stile}"`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const recipes = getAllReferenceRecipes().map((r) => parseReferenceRecipe(r)).filter((r) => r !== null);
			if (recipes.length === 0) return Promise.resolve({ output: "Nessuna ricetta di riferimento trovata nella libreria." });
			const filtered = recipes.filter((r) => recipeMatches(r, args.stile, args.categoria));
			if (filtered.length === 0) return Promise.resolve({ output: `Nessuna ricetta di riferimento trovata per "${args.stile}"${args.categoria ? ` (categoria ${args.categoria})` : ""}. La libreria contiene ${recipes.length} ricette. Prova con un codice BJCP (es. "21A") o un nome di stile.` });
			const lines = [`**${filtered.length} ricetta/e di riferimento trovata/e per "${args.stile}"** (${recipes.length} totali in libreria)`, ""];
			filtered.sort((a, b) => a.codice_bjcp.localeCompare(b.codice_bjcp) || a.nome.localeCompare(b.nome, "it"));
			for (const r of filtered) {
				lines.push(args.dettaglio ? formatFull(r) : formatSummary(r));
				lines.push("");
			}
			return Promise.resolve({ output: lines.join("\n") });
		} catch (error) {
			return Promise.resolve({
				isError: true,
				output: error instanceof Error ? error.message : String(error)
			});
		}
	}
};
registerTool(ReferenceRecipeSearchTool);

//#endregion
//#region src/brewing/brewday-log.ts
/**
* Brewday log tool — journaling tool for tracking brew sessions.
*
* Stores a structured timeline for each brew session linked to a recipe.
* Each entry records: timestamp, phase (mash/boil/fermentation/etc),
* measurements (OG, temp, pH, etc), notes, issues, and improvements.
*
* Data stored per-user under the data root (`.brewing-data` inside the user's
* chroot, else `~/.kimi-code/brewing`) in `brewday/{recipe_key}.json`.
*/
function brewdayDir(root) {
	return join(root, "brewday");
}
function logFilePath(root, recipeKey) {
	return join(brewdayDir(root), `${sanitizeKey(recipeKey)}.json`);
}
function sanitizeKey(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
}
function ensureBrewdayDir(root) {
	const dir = brewdayDir(root);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
function loadLogFile(root, recipeKey) {
	const path = logFilePath(root, recipeKey);
	if (!existsSync(path)) return [];
	try {
		const raw = readFileSync(path, "utf-8");
		const parsed = JSON.parse(raw);
		if (parsed.version === 1 && Array.isArray(parsed.logs)) return parsed.logs;
		return [];
	} catch {
		return [];
	}
}
function saveLogFile(root, recipeKey, logs) {
	ensureBrewdayDir(root);
	const path = logFilePath(root, recipeKey);
	writeFileSync(path, JSON.stringify({
		version: 1,
		logs
	}, null, 2), "utf-8");
}
function listAllRecipeKeys(root) {
	ensureBrewdayDir(root);
	try {
		return readdirSync(brewdayDir(root)).filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json"));
	} catch {
		return [];
	}
}
const BrewdayLogInputSchema = object({
	action: _enum([
		"start",
		"add_entry",
		"log",
		"list",
		"read",
		"summary",
		"delete"
	]).describe("Action: 'start' (create new brew log), 'add_entry'/'log' (add a timed entry), 'list' (all brew logs for a recipe), 'read' (full log of a specific brew), 'summary' (set final summary/rating), 'delete' (remove a brew log)."),
	recipe_name: string().optional().describe("Recipe name (required for most actions)."),
	recipe_key: string().optional().describe("Recipe key override for file naming (auto-generated from recipe_name if omitted)."),
	recipe_path: string().optional().describe("Path to the recipe YAML file (auto-detected from recipe_list if omitted)."),
	brew_number: number().optional().describe("Which brew number (auto-incremented for start, required for add_entry/log/summary on existing brews)."),
	batch_size_litres: number().optional(),
	target_og: number().optional(),
	target_fg: number().optional(),
	brew_date: string().optional().describe("Brew date (ISO format). Defaults to today."),
	phase: string().optional().describe("Phase: mash, boil, whirlpool, cooling, fermentation, dry_hop, cold_crash, bottling, kegging, tasting, measurement, other."),
	notes: string().optional().describe("What happened, observations, measurements."),
	issues: string().optional().describe("What went wrong or unexpected."),
	improvements: string().optional().describe("What to do better next time."),
	measurements_json: string().optional().describe("JSON string of key-value measurements. Example: '{\"og\":1.052,\"temp_c\":67,\"ph\":5.4}'."),
	duration_minutes: number().optional().describe("Duration of this phase in minutes."),
	timestamp: string().optional().describe("ISO timestamp for the entry. Defaults to now."),
	actual_og: number().optional(),
	actual_fg: number().optional(),
	actual_abv: number().optional(),
	efficiency_percent: number().optional(),
	summary: string().optional().describe("Overall summary of the brew session."),
	rating: number().optional().describe("Rating 1-10."),
	status: string().optional().describe("Brew status: planned, in_progress, completed, archived. Default \"in_progress\" for start, \"completed\" when summary is set.")
});
function formatBrewdayEntry(e) {
	let line = `⏱️ \`${e.timestamp.slice(0, 19).replace("T", " ")}\` **[${e.phase}]** ${e.notes}`;
	if (e.measurements && Object.keys(e.measurements).length > 0) {
		const m = Object.entries(e.measurements).map(([k, v]) => `${k}: ${v}`).join(", ");
		line += `\n    📏 ${m}`;
	}
	if (e.duration_minutes) line += ` (${e.duration_minutes} min)`;
	if (e.issues) line += `\n    ⚠️ Problema: ${e.issues}`;
	if (e.improvements) line += `\n    💡 Miglioramento: ${e.improvements}`;
	return line;
}
function formatBrewdayLog(log) {
	const lines = [];
	const se = {
		planned: "📋",
		in_progress: "🔄",
		completed: "✅",
		archived: "📦"
	}[log.status] ?? "❓";
	lines.push(`## ${se} ${log.recipe_name} — Cotta #${log.brew_number} (${log.status})`);
	lines.push(`📅 Data cotta: ${log.brew_date ?? "Non specificata"}`);
	if (log.batch_size_litres) lines.push(`📦 Batch: ${log.batch_size_litres}L`);
	if (log.target_og) lines.push(`🎯 Target OG: ${log.target_og.toFixed(3)}`);
	if (log.actual_og) lines.push(`🔬 OG misurato: ${log.actual_og.toFixed(3)}`);
	if (log.target_fg) lines.push(`🎯 Target FG: ${log.target_fg.toFixed(3)}`);
	if (log.actual_fg) lines.push(`🔬 FG misurato: ${log.actual_fg.toFixed(3)}`);
	if (log.actual_abv) lines.push(`🍺 ABV effettivo: ${log.actual_abv}%`);
	if (log.efficiency_percent) lines.push(`⚙️ Efficienza: ${log.efficiency_percent}%`);
	if (log.rating) lines.push(`⭐ Valutazione: ${log.rating}/10`);
	if (log.entries.length > 0) {
		lines.push("");
		lines.push("### Cronologia");
		const sorted = [...log.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
		for (const e of sorted) lines.push(formatBrewdayEntry(e));
	}
	if (log.summary) {
		lines.push("");
		lines.push(`### 📝 Riepilogo\n${log.summary}`);
	}
	lines.push(`\n_creato: ${log.createdAt.slice(0, 10)}, aggiornato: ${log.updatedAt.slice(0, 10)}_`);
	return lines.join("\n");
}
var BrewdayLogTool = class {
	name = "brewday_log";
	description = "Diario di cotta brassicola. Registra ogni fase della produzione (mash, boil, fermentazione, dry hop, imbottigliamento, ecc.) con misure, note, problemi e miglioramenti. Ogni cotta è collegata a una ricetta. Usalo per tracciare tutto ciò che succede durante una cotta e poterlo consultare in futuro.";
	parameters = {
		type: "object",
		properties: {
			action: {
				type: "string",
				description: "Action: 'start' (create new brew log), 'add_entry'/'log' (add a timed entry), 'list' (all brew logs for a recipe), 'read' (full log of a specific brew), 'summary' (set final summary/rating), 'delete' (remove a brew log)."
			},
			recipe_name: {
				type: "string",
				description: "Recipe name (required for most actions)."
			},
			recipe_key: {
				type: "string",
				description: "Recipe key for file naming (auto-generated from recipe_name if omitted)."
			},
			recipe_path: {
				type: "string",
				description: "Path to the recipe YAML file."
			},
			brew_number: {
				type: "number",
				description: "Which brew number (auto-incremented for start)."
			},
			batch_size_litres: { type: "number" },
			target_og: { type: "number" },
			target_fg: { type: "number" },
			brew_date: {
				type: "string",
				description: "Brew date (ISO format). Defaults to today."
			},
			phase: {
				type: "string",
				description: "Phase: mash, boil, whirlpool, cooling, fermentation, dry_hop, cold_crash, bottling, kegging, tasting, measurement, other."
			},
			notes: {
				type: "string",
				description: "What happened, observations, measurements."
			},
			issues: {
				type: "string",
				description: "What went wrong or unexpected."
			},
			improvements: {
				type: "string",
				description: "What to do better next time."
			},
			measurements_json: {
				type: "string",
				description: "JSON string of key-value measurements. Example: '{\"og\":1.052,\"temp_c\":67,\"ph\":5.4}'."
			},
			duration_minutes: {
				type: "number",
				description: "Duration of this phase in minutes."
			},
			timestamp: {
				type: "string",
				description: "ISO timestamp for the entry. Defaults to now."
			},
			actual_og: { type: "number" },
			actual_fg: { type: "number" },
			actual_abv: { type: "number" },
			efficiency_percent: { type: "number" },
			summary: {
				type: "string",
				description: "Overall summary of the brew session."
			},
			rating: {
				type: "number",
				description: "Rating 1-10."
			},
			status: {
				type: "string",
				description: "Brew status: planned, in_progress, completed, archived."
			}
		},
		required: ["action"],
		additionalProperties: false
	};
	resolveExecution(args) {
		const root = dataRoot(args);
		return {
			description: args.action === "start" ? `Start brew log: ${args.recipe_name ?? "unknown"}` : `Brewday ${args.action}: ${args.recipe_name ?? ""}`,
			approvalRule: this.name,
			execute: () => this.execute(args, root)
		};
	}
	execute(args, root) {
		try {
			switch (args.action) {
				case "start": return this.handleStart(args, root);
				case "add_entry":
				case "log": return this.handleAddEntry(args, root);
				case "list": return this.handleList(args, root);
				case "read": return this.handleRead(args, root);
				case "summary": return this.handleSummary(args, root);
				case "delete": return this.handleDelete(args, root);
				default: return Promise.resolve({
					isError: true,
					output: `Azione sconosciuta: ${args.action}`
				});
			}
		} catch (error) {
			return Promise.resolve({
				isError: true,
				output: error instanceof Error ? error.message : String(error)
			});
		}
	}
	handleStart(args, root) {
		if (!args.recipe_name) return Promise.resolve({
			isError: true,
			output: "recipe_name è obbligatorio per start."
		});
		const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
		const logs = loadLogFile(root, recipeKey);
		const brewNumber = logs.length + 1;
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const newLog = {
			version: 1,
			recipe_name: args.recipe_name,
			recipe_key: recipeKey,
			recipe_path: args.recipe_path,
			brew_number: brewNumber,
			brew_date: args.brew_date ?? now.slice(0, 10),
			batch_size_litres: args.batch_size_litres,
			target_og: args.target_og,
			target_fg: args.target_fg,
			entries: [],
			status: args.status ?? "in_progress",
			createdAt: now,
			updatedAt: now
		};
		logs.push(newLog);
		saveLogFile(root, recipeKey, logs);
		return Promise.resolve({ output: [
			`✅ **Cotta #${brewNumber} avviata:** ${args.recipe_name}`,
			`📅 Data: ${newLog.brew_date}`,
			args.batch_size_litres ? `📦 Batch: ${args.batch_size_litres}L` : "",
			`📂 File: \`${logFilePath(root, recipeKey)}\` (key: ${recipeKey})`,
			"",
			`Usa \`brewday_log action:"add_entry" recipe_name:"${args.recipe_name}" ...\` per registrare gli eventi.`
		].filter(Boolean).join("\n") });
	}
	parseMeasurements(rawJson) {
		if (!rawJson) return void 0;
		try {
			const parsed = JSON.parse(rawJson);
			if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
		} catch {}
	}
	handleAddEntry(args, root) {
		if (!args.recipe_name) return Promise.resolve({
			isError: true,
			output: "recipe_name è obbligatorio."
		});
		if (!args.notes) return Promise.resolve({
			isError: true,
			output: "notes è obbligatorio per add_entry."
		});
		const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
		const logs = loadLogFile(root, recipeKey);
		if (logs.length === 0) return Promise.resolve({
			isError: true,
			output: `Nessuna cotta trovata per "${args.recipe_name}". Usa action:"start" prima.`
		});
		const brewNumber = args.brew_number ?? logs.length;
		const idx = logs.findIndex((l) => l.brew_number === brewNumber);
		if (idx < 0) return Promise.resolve({
			isError: true,
			output: `Cotta #${brewNumber} non trovata per "${args.recipe_name}". Cotte disponibili: ${logs.map((l) => l.brew_number).join(", ")}`
		});
		const target = logs[idx];
		const measurements = this.parseMeasurements(args.measurements_json);
		const entry = {
			timestamp: args.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
			phase: args.phase ?? "other",
			notes: args.notes ?? "",
			issues: args.issues,
			improvements: args.improvements,
			duration_minutes: args.duration_minutes,
			measurements
		};
		if (measurements) {
			const mOg = measurements["og"];
			const mFg = measurements["fg"];
			if (typeof mOg === "number") target.actual_og = mOg;
			if (typeof mFg === "number") target.actual_fg = mFg;
		}
		target.entries.push(entry);
		target.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		saveLogFile(root, recipeKey, logs);
		return Promise.resolve({ output: [`📝 **Entry aggiunta alla Cotta #${brewNumber}** di "${args.recipe_name}"`, formatBrewdayEntry(entry)].join("\n") });
	}
	handleList(args, root) {
		if (args.recipe_name) {
			const logs = loadLogFile(root, args.recipe_key ?? sanitizeKey(args.recipe_name));
			if (logs.length === 0) return Promise.resolve({ output: `Nessuna cotta registrata per "${args.recipe_name}".` });
			const lines = [`**${logs.length} cotta/e per "${args.recipe_name}":**`, ""];
			for (const log of logs) {
				const se = {
					planned: "📋",
					in_progress: "🔄",
					completed: "✅",
					archived: "📦"
				}[log.status] ?? "❓";
				lines.push(`${se} **#${log.brew_number}** — ${log.brew_date} — ${log.status} — ${log.entries.length} entry — Rating: ${log.rating ?? "n/a"}/10`);
				if (log.summary) lines.push(`   ${log.summary.slice(0, 120)}${log.summary.length > 120 ? "..." : ""}`);
			}
			return Promise.resolve({ output: lines.join("\n") });
		}
		const keys = listAllRecipeKeys(root);
		if (keys.length === 0) return Promise.resolve({ output: "Nessun diario di cotta trovato. Usa `brewday_log action:\"start\"` per iniziarne uno." });
		const lines = [`**${keys.length} ricette con diario di cotta:**`, ""];
		for (const key of keys.sort()) {
			const logs = loadLogFile(root, key);
			const name = logs[0]?.recipe_name ?? key;
			const activeCount = logs.filter((l) => l.status === "in_progress").length;
			const completedCount = logs.filter((l) => l.status === "completed").length;
			const total = logs.length;
			lines.push(`📋 **${name}** — ${total} cotta/e (${activeCount} in corso, ${completedCount} completate)`);
		}
		return Promise.resolve({ output: lines.join("\n") });
	}
	handleRead(args, root) {
		if (!args.recipe_name) return Promise.resolve({
			isError: true,
			output: "recipe_name è obbligatorio per read."
		});
		const logs = loadLogFile(root, args.recipe_key ?? sanitizeKey(args.recipe_name));
		if (logs.length === 0) return Promise.resolve({ output: `Nessuna cotta registrata per "${args.recipe_name}".` });
		if (args.brew_number) {
			const log = logs.find((l) => l.brew_number === args.brew_number);
			if (!log) return Promise.resolve({
				isError: true,
				output: `Cotta #${args.brew_number} non trovata. Disponibili: ${logs.map((l) => l.brew_number).join(", ")}`
			});
			return Promise.resolve({ output: formatBrewdayLog(log) });
		}
		const lines = [`# Diario di cotta: ${args.recipe_name}`, ""];
		for (const log of logs) {
			lines.push(formatBrewdayLog(log));
			lines.push("---");
		}
		return Promise.resolve({ output: lines.join("\n") });
	}
	handleSummary(args, root) {
		if (!args.recipe_name) return Promise.resolve({
			isError: true,
			output: "recipe_name è obbligatorio."
		});
		const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
		const logs = loadLogFile(root, recipeKey);
		const brewNumber = args.brew_number ?? logs.length;
		const idx = logs.findIndex((l) => l.brew_number === brewNumber);
		if (idx < 0) return Promise.resolve({
			isError: true,
			output: `Cotta #${brewNumber} non trovata.`
		});
		const target = logs[idx];
		if (args.summary) target.summary = args.summary;
		if (args.rating) target.rating = args.rating;
		if (args.actual_og) target.actual_og = args.actual_og;
		if (args.actual_fg) target.actual_fg = args.actual_fg;
		if (args.actual_abv) target.actual_abv = args.actual_abv;
		if (args.efficiency_percent) target.efficiency_percent = args.efficiency_percent;
		if (args.status) target.status = args.status;
		if (args.summary && target.status === "in_progress") target.status = "completed";
		target.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		saveLogFile(root, recipeKey, logs);
		return Promise.resolve({ output: [
			`✅ **Riepilogo aggiornato** per Cotta #${brewNumber} di "${args.recipe_name}"`,
			`📊 Status: ${target.status}`,
			target.rating ? `⭐ Rating: ${target.rating}/10` : "",
			target.actual_og ? `🔬 OG: ${target.actual_og.toFixed(3)}` : "",
			target.actual_fg ? `🔬 FG: ${target.actual_fg.toFixed(3)}` : "",
			target.actual_abv ? `🍺 ABV: ${target.actual_abv}%` : "",
			target.efficiency_percent ? `⚙️ Efficienza: ${target.efficiency_percent}%` : "",
			"",
			target.summary ?? "(nessun riepilogo testuale)"
		].filter(Boolean).join("\n") });
	}
	handleDelete(args, root) {
		if (!args.recipe_name) return Promise.resolve({
			isError: true,
			output: "recipe_name è obbligatorio per delete."
		});
		const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
		const logs = loadLogFile(root, recipeKey);
		if (args.brew_number) {
			const idx = logs.findIndex((l) => l.brew_number === args.brew_number);
			if (idx < 0) return Promise.resolve({
				isError: true,
				output: `Cotta #${args.brew_number} non trovata.`
			});
			logs.splice(idx, 1);
			if (logs.length === 0) {
				const path = logFilePath(root, recipeKey);
				if (existsSync(path)) unlinkSync(path);
				return Promise.resolve({ output: `🗑️ Cotta #${args.brew_number} eliminata. File rimosso (nessuna altra cotta per "${args.recipe_name}").` });
			}
			saveLogFile(root, recipeKey, logs);
			return Promise.resolve({ output: `🗑️ Cotta #${args.brew_number} eliminata da "${args.recipe_name}". ${logs.length} cotta/e rimanenti.` });
		}
		const path = logFilePath(root, recipeKey);
		if (existsSync(path)) unlinkSync(path);
		return Promise.resolve({ output: `🗑️ Tutte le cotte per "${args.recipe_name}" eliminate.` });
	}
};
registerTool(BrewdayLogTool);

//#endregion
//#region src/brewing/fruit-calculator.ts
/**
* Fruit calculator — estimate fruit dosage for fruit beers.
*
* Computes a recommended dosage range (not an exact quantity) based on
* fruit aromatic potency, fruit form, addition method, beer style, and
* other fruits already present. Also estimates the theoretical alcohol
* potential of the added fruit sugars and the water contributed by the
* actual product.
*
* Important caveats: the intensity scale and aromatic factors are sensory
* heuristics, not calibrated instruments. Actual extraction yield depends
* on contact time, temperature, bag/loose fruit, and ripeness.
*/
const FRUITS = [
	{
		id: "strawberry",
		name: "Fragola",
		aliases: ["fragole", "strawberry"],
		factor: 1,
		sugarPercent: 5,
		waterPercent: 91,
		typicalBrix: 8,
		ph: 3.5,
		notes: "Riferimento. Aroma riconoscibile dai 50 g/L."
	},
	{
		id: "raspberry",
		name: "Lampone",
		aliases: ["lamponi", "raspberry"],
		factor: .7,
		sugarPercent: 4,
		waterPercent: 87,
		typicalBrix: 8,
		ph: 3.3,
		notes: "Molto aromatico. Acidità elevata."
	},
	{
		id: "blackberry",
		name: "Mora",
		aliases: ["more", "blackberry"],
		factor: .8,
		sugarPercent: 5,
		waterPercent: 88,
		typicalBrix: 10,
		ph: 3.4,
		notes: "Buona persistenza. Semi fastidiosi."
	},
	{
		id: "blueberry",
		name: "Mirtillo",
		aliases: ["mirtilli", "blueberry"],
		factor: 1.2,
		sugarPercent: 10,
		waterPercent: 84,
		typicalBrix: 14,
		ph: 3.3,
		notes: "Meno aromatico del previsto."
	},
	{
		id: "cranberry",
		name: "Mirtillo rosso",
		aliases: ["cranberry", "mirtilli rossi"],
		factor: .9,
		sugarPercent: 4,
		waterPercent: 87,
		typicalBrix: 8,
		ph: 2.5,
		notes: "Molto acido. Attenzione pH."
	},
	{
		id: "redcurrant",
		name: "Ribes rosso",
		aliases: ["ribes", "redcurrant"],
		factor: .6,
		sugarPercent: 7,
		waterPercent: 82,
		typicalBrix: 10,
		ph: 2.7,
		notes: "Molto aromatico. Ottimo in sour."
	},
	{
		id: "blackcurrant",
		name: "Ribes nero",
		aliases: ["cassis", "blackcurrant"],
		factor: .5,
		sugarPercent: 6,
		waterPercent: 82,
		typicalBrix: 12,
		ph: 2.8,
		notes: "Fortissimo. 30 g/L bastano."
	},
	{
		id: "gooseberry",
		name: "Uva spina",
		aliases: ["gooseberry"],
		factor: .8,
		sugarPercent: 5,
		waterPercent: 88,
		typicalBrix: 8,
		ph: 3,
		notes: "Buona acidità."
	},
	{
		id: "sour_cherry",
		name: "Amarena / visciola",
		aliases: [
			"amarene",
			"visciola",
			"sour cherry"
		],
		factor: .75,
		sugarPercent: 8,
		waterPercent: 82,
		typicalBrix: 14,
		ph: 3.3,
		notes: "Classica italiana."
	},
	{
		id: "elderberry",
		name: "Sambuco",
		aliases: ["elderberry"],
		factor: .6,
		sugarPercent: 7,
		waterPercent: 80,
		typicalBrix: 11,
		ph: 3.8,
		notes: "Solo succo, no semi (cianuro)."
	},
	{
		id: "cherry",
		name: "Ciliegia",
		aliases: ["ciliegie", "cherry"],
		factor: .9,
		sugarPercent: 12,
		waterPercent: 82,
		typicalBrix: 16,
		ph: 3.7,
		notes: "Marasche più intense."
	},
	{
		id: "peach",
		name: "Pesca",
		aliases: ["pesche", "peach"],
		factor: 1,
		sugarPercent: 9,
		waterPercent: 89,
		typicalBrix: 12,
		ph: 3.8,
		notes: "Aroma delicato."
	},
	{
		id: "apricot",
		name: "Albicocca",
		aliases: ["albicocche", "apricot"],
		factor: 1,
		sugarPercent: 9,
		waterPercent: 86,
		typicalBrix: 12,
		ph: 3.7,
		notes: "Varietà tardive più aromatiche."
	},
	{
		id: "plum",
		name: "Prugna",
		aliases: [
			"prugne",
			"susine",
			"plum"
		],
		factor: 1,
		sugarPercent: 10,
		waterPercent: 87,
		typicalBrix: 14,
		ph: 3.5,
		notes: "Varietà rosse miglior colore."
	},
	{
		id: "damson",
		name: "Susina selvatica",
		aliases: ["damson"],
		factor: .8,
		sugarPercent: 8,
		waterPercent: 80,
		typicalBrix: 12,
		ph: 3,
		notes: "Più acida della prugna comune."
	},
	{
		id: "mango",
		name: "Mango",
		aliases: [],
		factor: .8,
		sugarPercent: 14,
		waterPercent: 83,
		typicalBrix: 17,
		ph: 4,
		notes: "Perfetto in IPA. Usare mango maturo."
	},
	{
		id: "pineapple",
		name: "Ananas",
		aliases: [],
		factor: .8,
		sugarPercent: 10,
		waterPercent: 86,
		typicalBrix: 13,
		ph: 3.5,
		notes: "Enzima bromelina: degrada proteine."
	},
	{
		id: "passionfruit",
		name: "Frutto della passione",
		aliases: [
			"passion fruit",
			"maracuja",
			"maracujá"
		],
		factor: .6,
		sugarPercent: 11,
		waterPercent: 73,
		typicalBrix: 15,
		ph: 3,
		notes: "Molto aromatico. Acidità marcata."
	},
	{
		id: "guava",
		name: "Guava",
		aliases: [],
		factor: .8,
		sugarPercent: 9,
		waterPercent: 81,
		typicalBrix: 12,
		ph: 3.8,
		notes: "Aroma tropicale distintivo."
	},
	{
		id: "papaya",
		name: "Papaya",
		aliases: [],
		factor: 1,
		sugarPercent: 8,
		waterPercent: 88,
		typicalBrix: 10,
		ph: 5,
		notes: "Enzima papaina. pH alto."
	},
	{
		id: "coconut",
		name: "Cocco",
		aliases: [],
		factor: 1.2,
		sugarPercent: 3,
		waterPercent: 47,
		typicalBrix: 5,
		ph: 6,
		notes: "Tostato non zuccherato. Grasso = schiuma."
	},
	{
		id: "lychee",
		name: "Lychee",
		aliases: ["litchi"],
		factor: .9,
		sugarPercent: 15,
		waterPercent: 82,
		typicalBrix: 18,
		ph: 4.5,
		notes: "Floreale delicato."
	},
	{
		id: "orange",
		name: "Arancia",
		aliases: [
			"arance",
			"orange",
			"arancia dolce"
		],
		factor: .9,
		sugarPercent: 9,
		waterPercent: 87,
		typicalBrix: 12,
		ph: 3.6,
		notes: "Succo + scorza. Navel, Valencia. Meno intensa della rossa."
	},
	{
		id: "mandarin",
		name: "Mandarino",
		aliases: [
			"mandarini",
			"mandarin",
			"tangerine",
			"clementina"
		],
		factor: .8,
		sugarPercent: 10,
		waterPercent: 85,
		typicalBrix: 13,
		ph: 3.7,
		notes: "Più aromatico dell'arancia. Ottimo in wit e saison."
	},
	{
		id: "blood_orange",
		name: "Arancia rossa",
		aliases: ["tarocco", "blood orange"],
		factor: .8,
		sugarPercent: 9,
		waterPercent: 87,
		typicalBrix: 12,
		ph: 3.5,
		notes: "Succo + scorza. Wit e sour."
	},
	{
		id: "grapefruit",
		name: "Pompelmo rosa",
		aliases: ["pompelmo", "grapefruit"],
		factor: .7,
		sugarPercent: 6,
		waterPercent: 90,
		typicalBrix: 10,
		ph: 3.2,
		notes: "Amareggiante. Interagisce farmaci."
	},
	{
		id: "lemon_lime",
		name: "Limone / lime",
		aliases: [
			"limone",
			"lime",
			"limoni"
		],
		factor: .5,
		sugarPercent: 2,
		waterPercent: 89,
		typicalBrix: 8,
		ph: 2.2,
		notes: "Succo + scorza. ACIDO."
	},
	{
		id: "pear",
		name: "Pera",
		aliases: ["pere", "pear"],
		factor: 1.1,
		sugarPercent: 10,
		waterPercent: 84,
		typicalBrix: 13,
		ph: 4,
		notes: "Delicata. Williams."
	},
	{
		id: "apple",
		name: "Mela",
		aliases: ["mele", "apple"],
		factor: 1.1,
		sugarPercent: 10,
		waterPercent: 85,
		typicalBrix: 13,
		ph: 3.5,
		notes: "Granny Smith, Pink Lady."
	},
	{
		id: "banana",
		name: "Banana",
		aliases: ["banane"],
		factor: .8,
		sugarPercent: 12,
		waterPercent: 75,
		typicalBrix: 20,
		ph: 5,
		notes: "Corpo e torbidità."
	},
	{
		id: "melon",
		name: "Melone",
		aliases: [],
		factor: 1.3,
		sugarPercent: 8,
		waterPercent: 90,
		typicalBrix: 10,
		ph: 5.5,
		notes: "Molto delicato. pH alto."
	},
	{
		id: "watermelon",
		name: "Anguria",
		aliases: [
			"anguria",
			"watermelon",
			"cocomero"
		],
		factor: 1.5,
		sugarPercent: 6,
		waterPercent: 91,
		typicalBrix: 8,
		ph: 5.3,
		notes: "Acquosissima. Diluisce molto."
	},
	{
		id: "cucumber",
		name: "Cetriolo",
		aliases: ["cetrioli", "cucumber"],
		factor: 1.5,
		sugarPercent: 2,
		waterPercent: 95,
		typicalBrix: 4,
		ph: 5.5,
		notes: "Buccia per aroma, polpa per volume."
	},
	{
		id: "pumpkin",
		name: "Zucca",
		aliases: ["pumpkin"],
		factor: 1.3,
		sugarPercent: 3,
		waterPercent: 92,
		typicalBrix: 8,
		ph: 5.5,
		notes: "Cuocere prima."
	},
	{
		id: "fig",
		name: "Fico",
		aliases: ["fichi", "fig"],
		factor: .9,
		sugarPercent: 16,
		waterPercent: 79,
		typicalBrix: 20,
		ph: 5,
		notes: "Molto zuccherino."
	},
	{
		id: "date",
		name: "Dattero",
		aliases: ["datteri", "date"],
		factor: .7,
		sugarPercent: 63,
		waterPercent: 21,
		typicalBrix: 70,
		ph: 5.5,
		notes: "Pastorizzare 30 min a 70°C."
	},
	{
		id: "grape_must",
		name: "Uva (mosto)",
		aliases: [
			"mosto d'uva",
			"grape must",
			"uva"
		],
		factor: 1,
		sugarPercent: 16,
		waterPercent: 81,
		typicalBrix: 20,
		ph: 3.3,
		notes: "Contributo alcolico significativo."
	}
];
const INTENSITIES = [
	{
		label: "Accenno",
		minGL: 20,
		maxGL: 50,
		midGL: 35
	},
	{
		label: "Leggero",
		minGL: 50,
		maxGL: 100,
		midGL: 75
	},
	{
		label: "Medio",
		minGL: 100,
		maxGL: 200,
		midGL: 150
	},
	{
		label: "Intenso",
		minGL: 200,
		maxGL: 400,
		midGL: 300
	},
	{
		label: "Estremo",
		minGL: 400,
		maxGL: 800,
		midGL: 600
	}
];
const FORMS$1 = {
	fresh: { label: "Fresco / congelato / surgelato" },
	puree: { label: "Purea sterile (es. Boiron)" },
	juice: { label: "Succo 100%" },
	concentrate: { label: "Concentrato (65°Brix)" },
	lyophilized: { label: "Liofilizzato in polvere" },
	dried: { label: "Essiccato / disidratato" }
};
const METHODS = {
	secondary: {
		label: "In fermentatore (post-fermentazione)",
		efficiency: 1
	},
	whirlpool: {
		label: "Whirlpool a caldo (80-95°C)",
		efficiency: .7
	},
	end_boil: {
		label: "Fine bollitura (ultimi 5 min)",
		efficiency: .5
	},
	mash: {
		label: "In mash",
		efficiency: .3
	},
	tincture: {
		label: "Tintura alcolica post-fermento",
		efficiency: 1
	},
	keg: {
		label: "In fusto / serving tank",
		efficiency: 1
	}
};
const STYLE_ADJ = {
	sour: { factor: .85 },
	ipa: { factor: 1.15 },
	stout: { factor: 1.3 },
	wheat: { factor: 1 },
	blonde: { factor: .95 },
	saison: { factor: 1.05 },
	belgian: { factor: 1.1 },
	lager: { factor: 1 },
	neipa: { factor: 1.1 },
	other: { factor: 1 }
};
const FRUIT_PARAMS_SCHEMA = object({
	name: string().trim().min(1).describe("Nome del frutto."),
	factor: number().positive().describe("Fattore aromatico (es. 1.00 = fragola, 0.50 = ribes nero, 1.50 = anguria). Più basso = più aromatico."),
	sugarPercent: number().min(0).max(100).describe("g zuccheri per 100 g di frutto fresco."),
	waterPercent: number().min(0).max(100).describe("g acqua per 100 g di frutto fresco."),
	typicalBrix: number().min(0).max(100).describe("°Brix approssimativo del frutto fresco."),
	ph: number().min(0).max(14).describe("pH del frutto fresco."),
	notes: string().default("")
});
const FruitCalculatorInputSchema = object({
	fruit_name: string().trim().min(1).describe("Nome del frutto principale in italiano."),
	/** Parametri per un frutto non presente nel database integrato. Se fornito, sovrascrive la ricerca nel database. */
	fruit_params: FRUIT_PARAMS_SCHEMA.optional().describe("Parametri del frutto (fattore aromatico, zuccheri, acqua, °Brix, pH). Obbligatorio solo se il frutto non è presente nel database."),
	batch_size_liters: number().positive().describe("Volume attuale della birra dopo gli altri frutti e prima del frutto principale (L)."),
	intensity: _enum([
		"accenno",
		"leggero",
		"medio",
		"intenso",
		"estremo"
	]).default("leggero"),
	fruit_form: _enum([
		"fresh",
		"puree",
		"juice",
		"concentrate",
		"lyophilized",
		"dried"
	]).default("fresh"),
	addition_method: _enum([
		"secondary",
		"whirlpool",
		"end_boil",
		"mash",
		"tincture",
		"keg"
	]).default("secondary"),
	beer_style: _enum([
		"sour",
		"ipa",
		"stout",
		"wheat",
		"blonde",
		"saison",
		"belgian",
		"lager",
		"neipa",
		"other"
	]).default("other"),
	initial_abv: number().min(0).max(20).optional().describe("ABV della birra DOPO gli altri frutti e PRIMA del frutto principale (opzionale)."),
	/** Tincture-specific params — only meaningful when addition_method === 'tincture'. */
	tincture_alcohol_abv: number().min(.4).max(.96).default(.95).describe("Alcool per tintura (frazione, es. 0.95)."),
	tincture_ml_per_g: number().positive().default(1.3).describe("mL alcool per g di liofilizzato."),
	/** Other fruits, each with its own name, fresh-equivalent kg, and addition method. */
	other_fruits: array(object({
		fruit_name: string().trim().min(1),
		fresh_equivalent_kg: number().positive(),
		addition_method: _enum([
			"secondary",
			"whirlpool",
			"end_boil",
			"mash",
			"keg"
		]).default("secondary"),
		/** Parametri per un frutto non nel database. Se fornito, sovrascrive la ricerca. */
		fruit_params: FRUIT_PARAMS_SCHEMA.optional()
	})).default([]).describe("Altri frutti già presenti, ciascuno con nome, kg freschi eq. e metodo di aggiunta."),
	show_details: boolean().default(true)
}).superRefine((input, ctx) => {
	if (input.addition_method === "tincture" && !["lyophilized", "dried"].includes(input.fruit_form)) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["fruit_form"],
		message: "Per la tintura seleziona liofilizzato o essiccato."
	});
});
function normalizeName$1(value) {
	return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}
/** Return all exact matches sorted by specificity. */
function findAllMatches(raw) {
	const query = normalizeName$1(raw);
	const exactMatches = FRUITS.filter((f) => f.id === query || normalizeName$1(f.name) === query || f.aliases.some((a) => normalizeName$1(a) === query));
	if (exactMatches.length > 0) return exactMatches;
	return FRUITS.filter((f) => normalizeName$1(f.name).includes(query) || f.aliases.some((a) => normalizeName$1(a).includes(query))).sort((a, b) => Math.abs(a.name.length - raw.length) - Math.abs(b.name.length - raw.length));
}
function isFormApplicable(fruit, form) {
	return !(form === "concentrate" && fruit.typicalBrix >= 65);
}
/**
* Convert fresh-equivalent kg to actual product mass.
* Throws if the *requested* form is not applicable.
*/
function toProductKg(freshKg, fruit, formKey) {
	if (formKey === "concentrate" && fruit.typicalBrix >= 65) throw new Error(`Il concentrato 65 °Brix non è applicabile a ${fruit.name}: il prodotto di partenza è già circa ${fruit.typicalBrix} °Brix.`);
	switch (formKey) {
		case "fresh":
		case "puree":
		case "juice": return freshKg;
		case "concentrate": {
			const brix = fruit.typicalBrix;
			if (brix <= 0) return freshKg;
			return freshKg * (brix / 65);
		}
		case "lyophilized": {
			const solidsFresh = (100 - fruit.waterPercent) / 100;
			if (solidsFresh <= 0) return freshKg * .1;
			return freshKg * solidsFresh / .96;
		}
		case "dried": {
			const solidsFresh = (100 - fruit.waterPercent) / 100;
			if (solidsFresh <= 0) return freshKg * .25;
			return freshKg * solidsFresh / .85;
		}
		default: return freshKg;
	}
}
/** Sugar in grams derived from the fresh-equivalent mass. Format conversion preserves sugar. */
function freshEquivalentSugarGrams(freshKg, fruit) {
	return freshKg * 1e3 * (fruit.sugarPercent / 100);
}
/** Water contributed by the ACTUAL product (kg). */
function productWaterKg(productKg, fruit, formKey) {
	switch (formKey) {
		case "fresh":
		case "puree":
		case "juice": return productKg * (fruit.waterPercent / 100);
		case "concentrate": return productKg * .35;
		case "lyophilized": return productKg * .04;
		case "dried": return productKg * .15;
		default: return 0;
	}
}
/** Build a FruitInfo from user-supplied fruit_params. */
function fruitInfoFromParams(name, params) {
	return {
		id: normalizeName$1(name),
		name,
		aliases: [],
		factor: params.factor,
		sugarPercent: params.sugarPercent,
		waterPercent: params.waterPercent,
		typicalBrix: params.typicalBrix,
		ph: params.ph,
		notes: params.notes
	};
}
/** Resolve a fruit by name, falling back to fruit_params when the name is not in the database. */
function resolveFruit(raw, params) {
	const matches = findAllMatches(raw);
	if (matches.length > 0) return {
		fruit: matches[0],
		ambiguousMatches: matches.length > 1 ? matches.slice(1).map((f) => f.name) : [],
		fromParams: false
	};
	if (params) return {
		fruit: fruitInfoFromParams(raw, params),
		ambiguousMatches: [],
		fromParams: true
	};
	throw new Error(`Frutto "${raw}" non trovato nel database. Fornisci fruit_params con i dati del frutto (fattore aromatico, zuccheri, acqua, °Brix, pH).`);
}
function compute$1(input) {
	const { fruit, ambiguousMatches } = resolveFruit(input.fruit_name, input.fruit_params);
	const intensity = INTENSITIES.find((i) => i.label.toLowerCase() === input.intensity);
	const method = METHODS[input.addition_method];
	const style = STYLE_ADJ[input.beer_style];
	const rawMidMainGL = intensity.midGL * fruit.factor * style.factor / method.efficiency;
	let totalOtherReferenceGL = 0;
	for (const other of input.other_fruits ?? []) {
		const { fruit: otherFruit } = resolveFruit(other.fruit_name, other.fruit_params);
		const otherMethod = METHODS[other.addition_method];
		const otherGL = other.fresh_equivalent_kg * 1e3 / input.batch_size_liters;
		totalOtherReferenceGL += otherGL * otherMethod.efficiency / otherFruit.factor / style.factor;
	}
	const remainingMinReferenceGL = Math.max(0, intensity.minGL - totalOtherReferenceGL);
	const remainingMaxReferenceGL = Math.max(0, intensity.maxGL - totalOtherReferenceGL);
	const finalMin = remainingMinReferenceGL * fruit.factor * style.factor / method.efficiency;
	const finalMax = remainingMaxReferenceGL * fruit.factor * style.factor / method.efficiency;
	const finalMid = (finalMin + finalMax) / 2;
	const otherReduction = rawMidMainGL > 0 ? Math.min(1, Math.max(0, 1 - finalMid / rawMidMainGL)) : 0;
	const midFreshKg = finalMid * input.batch_size_liters / 1e3;
	const midProductKg = toProductKg(midFreshKg, fruit, input.fruit_form);
	const sugarGrams = freshEquivalentSugarGrams(midFreshKg, fruit);
	const waterLiters = productWaterKg(midProductKg, fruit, input.fruit_form);
	return {
		fruit,
		intensityLabel: intensity.label,
		rangeMinGL: finalMin,
		rangeMaxGL: finalMax,
		midFreshGL: finalMid,
		midFreshKg,
		midProductKg,
		otherReduction,
		sugarGrams,
		waterLiters,
		form: input.fruit_form,
		methodEfficiency: method.efficiency,
		styleFactor: style.factor,
		initialAbv: input.initial_abv,
		tinctureAlcoholAbv: input.tincture_alcohol_abv,
		tinctureMlPerG: input.tincture_ml_per_g,
		otherFruits: input.other_fruits ?? [],
		ambiguousMatches
	};
}
function formatResults$1(input) {
	const lines = [];
	lines.push(`# 🍓 Fruit Calculator: ${input.fruit_name} in ${input.batch_size_liters}L`);
	lines.push("");
	let calc;
	try {
		calc = compute$1(input);
	} catch (e) {
		if (e instanceof Error && e.message.includes("non trovato nel database")) {
			lines.push(`⚠️ **"${input.fruit_name}" non trovato nel database.**`);
			lines.push("");
			lines.push("🔍 **Cerca online** i valori nutrizionali del frutto (zuccheri g/100g, acqua g/100g, pH) e stima il **fattore aromatico** (1.00 = fragola, <1 = più aromatico, >1 = meno aromatico). Poi riempi `fruit_params` e riprova la chiamata.");
			lines.push("");
			lines.push("Frutti già disponibili nel database:");
			for (const f of FRUITS) lines.push(`- ${f.name} (×${f.factor.toFixed(2)})`);
			return lines.join("\n");
		}
		lines.push(`❌ **Errore:** ${e instanceof Error ? e.message : String(e)}`);
		return lines.join("\n");
	}
	const formLabel = FORMS$1[calc.form].label;
	const methodLabel = METHODS[input.addition_method].label;
	lines.push("## 📊 Parametri");
	lines.push("");
	lines.push("| Parametro | Valore |");
	lines.push("|---|---|");
	if (input.fruit_params && !FRUITS.some((f) => normalizeName$1(f.name) === normalizeName$1(input.fruit_name) || f.aliases.some((a) => normalizeName$1(a) === normalizeName$1(input.fruit_name)))) lines.push(`| Frutto | **${calc.fruit.name}** *(parametri personalizzati)* |`);
	else lines.push(`| Frutto | **${calc.fruit.name}** |`);
	lines.push(`| Fattore aromatico | ×${calc.fruit.factor.toFixed(2)} |`);
	lines.push(`| Zuccheri | ${calc.fruit.sugarPercent} g/100g |`);
	lines.push(`| Acqua | ${calc.fruit.waterPercent} g/100g |`);
	lines.push(`| °Brix | ${calc.fruit.typicalBrix} |`);
	lines.push(`| Intensità | **${calc.intensityLabel}** |`);
	lines.push(`| Formato | ${formLabel} |`);
	lines.push(`| Metodo | ${methodLabel} (~${(calc.methodEfficiency * 100).toFixed(0)}% efficienza) |`);
	if (input.beer_style !== "other") lines.push(`| Stile | ${input.beer_style} (×${calc.styleFactor.toFixed(2)}) |`);
	if ((calc.otherFruits ?? []).length > 0) lines.push(`| Altri frutti | ${(calc.otherFruits ?? []).length} frutto/i → riduzione ~${(calc.otherReduction * 100).toFixed(0)}% sul principale |`);
	if (calc.ambiguousMatches.length > 0) lines.push(`| ⚠️ Ambiguità | Trovati anche: ${calc.ambiguousMatches.join(", ")}. Se intendevi uno di questi, specifica il nome esatto. |`);
	lines.push("");
	lines.push("## 🎯 Intervallo di dosaggio consigliato");
	lines.push("");
	lines.push(`Per **${input.batch_size_liters}L** (volume prima della frutta):`);
	lines.push("");
	const minKg = toProductKg(calc.rangeMinGL * input.batch_size_liters / 1e3, calc.fruit, calc.form);
	const maxKg = toProductKg(calc.rangeMaxGL * input.batch_size_liters / 1e3, calc.fruit, calc.form);
	lines.push("| Formato | Min | Consigliato | Max |");
	lines.push("|---|---|---|---|");
	lines.push(`| **${formLabel}** | **${minKg.toFixed(2)} kg** | **${calc.midProductKg.toFixed(2)} kg** | **${maxKg.toFixed(2)} kg** |`);
	lines.push(`| Fresco equivalente | ${(calc.rangeMinGL * input.batch_size_liters / 1e3).toFixed(2)} kg | ${calc.midFreshKg.toFixed(2)} kg | ${(calc.rangeMaxGL * input.batch_size_liters / 1e3).toFixed(2)} kg |`);
	lines.push(`| g/L fresco eq. | ${calc.rangeMinGL.toFixed(0)} | ${calc.midFreshGL.toFixed(0)} | ${calc.rangeMaxGL.toFixed(0)} |`);
	lines.push("");
	lines.push("> ⚠️ Intervallo indicativo basato su euristiche sensoriali. Regola nelle cotte successive.");
	lines.push("");
	lines.push("## 🔄 In altri formati");
	lines.push("");
	lines.push("| Formato | Quantità consigliata |");
	lines.push("|---|---|");
	for (const [key, fi] of Object.entries(FORMS$1)) {
		const form = key;
		if (form === calc.form) continue;
		if (!isFormApplicable(calc.fruit, form)) {
			lines.push(`| ${fi.label} | N/D — frutto già a ${calc.fruit.typicalBrix} °Brix |`);
			continue;
		}
		const qty = toProductKg(calc.midFreshKg, calc.fruit, form);
		lines.push(`| ${fi.label} | ${qty.toFixed(2)} kg |`);
	}
	lines.push("");
	if (input.addition_method === "tincture") {
		const substrateKg = calc.midProductKg;
		if (substrateKg > .001) {
			const substrateG = Math.round(substrateKg * 1e3);
			const alcMl = Math.round(substrateG * calc.tinctureMlPerG);
			const alcPct = calc.tinctureAlcoholAbv * 100;
			const substrateLabel = input.fruit_form === "lyophilized" ? "Liofilizzato" : "Essiccato";
			lines.push("## 🧪 Ricetta tintura alcolica");
			lines.push("");
			lines.push(`- ${substrateLabel} ${calc.fruit.name}: **${substrateG} g**`);
			lines.push(`- Alcool ${alcPct.toFixed(0)}°: **${alcMl} mL** (7-14gg al buio, filtrare)`);
			lines.push("");
		}
	}
	if (input.show_details) {
		const sugarG = calc.sugarGrams;
		function sugarRecoveryFor(fm, am) {
			if (fm === "juice" || fm === "concentrate") return .98;
			if (am === "tincture") return .9;
			return .85;
		}
		function waterRecoveryFor(fm) {
			if (fm === "juice" || fm === "concentrate") return .98;
			if (fm === "puree") return .9;
			if (fm === "lyophilized" || fm === "dried") return 0;
			return .75;
		}
		function estimatedProductDensityKgL(fm) {
			if (fm === "concentrate") return 1.32;
			if (fm === "juice") return 1 + calc.fruit.typicalBrix * .004;
			if (fm === "puree") return 1.05;
			return 1;
		}
		function transferredProductVolumeL(productKg, waterKg, fm) {
			if (fm === "juice" || fm === "concentrate" || fm === "puree") return productKg / estimatedProductDensityKgL(fm) * waterRecoveryFor(fm);
			return waterKg * waterRecoveryFor(fm);
		}
		const mainRecovery = sugarRecoveryFor(calc.form, input.addition_method);
		const fruitEthanolL = sugarG * mainRecovery * .95 * .95 * .51 / 789;
		let tinctureEthanolL = 0;
		let tinctureVolumeL = 0;
		if (input.addition_method === "tincture") {
			const alcMl = calc.midProductKg * 1e3 * calc.tinctureMlPerG;
			const tinctureRecoveryFraction = .85;
			tinctureVolumeL = alcMl / 1e3 * tinctureRecoveryFraction;
			tinctureEthanolL = alcMl / 1e3 * tinctureRecoveryFraction * calc.tinctureAlcoholAbv;
		}
		const hasInitialAbv = calc.initialAbv !== void 0;
		const initialEthanolL = hasInitialAbv ? input.batch_size_liters * (calc.initialAbv / 100) : 0;
		const transferredVolumeL = transferredProductVolumeL(calc.midProductKg, calc.waterLiters, calc.form);
		const finalVolumeL = input.batch_size_liters + transferredVolumeL + tinctureVolumeL;
		const totalEthanolL = initialEthanolL + fruitEthanolL + tinctureEthanolL;
		const finalAbv = finalVolumeL > 0 ? totalEthanolL / finalVolumeL * 100 : 0;
		const abvDelta = hasInitialAbv ? finalAbv - calc.initialAbv : void 0;
		lines.push("## 📈 Impatto sulla birra");
		lines.push("");
		lines.push("| Parametro | Valore |");
		lines.push("|---|---|");
		lines.push(`| Zuccheri aggiunti (frutto principale) | ~${sugarG.toFixed(0)} g`);
		lines.push(`| Potenziale alcolico (recupero zuccheri ~${(mainRecovery * 100).toFixed(0)}%) | ~+${(fruitEthanolL / finalVolumeL * 100).toFixed(1)}% ABV (solo frutto principale)`);
		if (tinctureVolumeL > 0) lines.push(`| Alcool tintura | ${(tinctureVolumeL * 1e3).toFixed(0)} mL al ${(calc.tinctureAlcoholAbv * 100).toFixed(0)}% → ~+${(tinctureEthanolL / finalVolumeL * 100).toFixed(1)}% ABV`);
		if (hasInitialAbv) {
			lines.push(`| ABV dopo altri frutti (prima del frutto principale) | ${calc.initialAbv.toFixed(1)}%`);
			lines.push(`| ABV finale stimato | **${finalAbv.toFixed(1)}%** (${abvDelta >= 0 ? "+" : ""}${abvDelta.toFixed(1)}%)`);
		}
		if (calc.waterLiters > .05) lines.push(`| Volume aggiunto dal prodotto | ~${calc.waterLiters.toFixed(1)} L teorico → ~${transferredVolumeL.toFixed(1)} L stimato nella birra (recupero ~${(waterRecoveryFor(calc.form) * 100).toFixed(0)}%)`);
		else lines.push("| Acqua dal prodotto | Trascurabile");
		lines.push(`| pH del frutto | ~${calc.fruit.ph}`);
		if (calc.fruit.ph < 3.2) lines.push("| ⚠️ pH | Molto acido. Misurare pH dopo aggiunta.");
		if (calc.fruit.ph > 4.5) lines.push("| ⚠️ pH | > 4.5. RISCHIO CONTAMINAZIONE. Pastorizzare sempre.");
		lines.push("");
		lines.push("> **Nota:** L'ABV finale è una stima. Il volume effettivo dipende dalle perdite di birra nella polpa e dal recupero degli zuccheri. L'acqua indicata è quella contenuta nel prodotto, non necessariamente quella trasferita nella birra confezionata.");
		lines.push("");
	}
	if (input.show_details) {
		lines.push("## 🔧 Note di processo");
		lines.push("");
		if (calc.fruit.ph > 4.5) lines.push("- ⚠️ Pastorizzare 70°C × 30 min prima dell'aggiunta.");
		if ([
			"Lampone",
			"Mora",
			"Fragola"
		].includes(calc.fruit.name)) lines.push("- Rimuovere semi dopo 5-7gg (astringenza).");
		if ([
			"Mela",
			"Pera",
			"Prugna",
			"Ribes rosso",
			"Ribes nero",
			"Mirtillo"
		].includes(calc.fruit.name)) lines.push("- Aggiungere pectinasi 2-3 g/hL.");
		if (input.fruit_form === "lyophilized") lines.push("- Reidratare in acqua tiepida. La liofilizzazione NON garantisce sterilità.");
		if (input.fruit_form === "fresh") lines.push("- Surgelare/scongelare. Pastorizzare 70°C × 15 min o metabisolfito.");
		if (input.fruit_form === "juice") lines.push("- Verificare Brix e zuccheri dichiarati del succo. La resa aromatica può differire dal fresco.");
		lines.push("- Usare hop bag per contenere la polpa.");
		lines.push("- Aspettare FG stabile dopo aggiunta prima di imbottigliare.");
		lines.push("");
	}
	lines.push("## 📋 Tabella per tutte le intensità");
	lines.push("");
	lines.push(`| Intensità | g/L fresco eq. | ${formLabel} |`);
	lines.push("|---|---|---|");
	for (const int of INTENSITIES) {
		let otherContrib = 0;
		for (const other of calc.otherFruits ?? []) try {
			const { fruit: of } = resolveFruit(other.fruit_name, other.fruit_params);
			const om = METHODS[other.addition_method];
			const ogl = other.fresh_equivalent_kg * 1e3 / input.batch_size_liters;
			otherContrib += ogl * om.efficiency / of.factor / calc.styleFactor;
		} catch {}
		const mid = (Math.max(0, int.minGL - otherContrib) + Math.max(0, int.maxGL - otherContrib)) / 2 * calc.fruit.factor * calc.styleFactor / calc.methodEfficiency;
		const kg = toProductKg(mid * input.batch_size_liters / 1e3, calc.fruit, calc.form);
		lines.push(`| ${int.label} | ${mid.toFixed(0)} | **${kg.toFixed(2)} kg** |`);
	}
	lines.push("");
	lines.push("---");
	lines.push("*Le intensità e i fattori aromatici sono euristiche sensoriali. Parti dal valore consigliato e regola nelle cotte successive.*");
	return lines.join("\n");
}
const FRUIT_CALCULATOR_PARAMETERS = {
	type: "object",
	properties: {
		fruit_name: {
			type: "string",
			description: "Nome del frutto principale in italiano. Es: \"Lampone\", \"Mango\", \"Fragola\", \"Frutto della passione\". Se il frutto non è nel database, cercalo online e passa i dati tramite fruit_params."
		},
		fruit_params: {
			type: "object",
			description: "⚠️ OBBLIGATORIO se il frutto non è nel database. Cerca online i valori nutrizionali (zuccheri, acqua, pH, °Brix) e stima il fattore aromatico, poi compila questo oggetto e riprova la chiamata.",
			properties: {
				name: {
					type: "string",
					minLength: 1,
					description: "Nome del frutto."
				},
				factor: {
					type: "number",
					exclusiveMinimum: 0,
					description: "Fattore aromatico (es. 1.00 = fragola, 0.50 = ribes nero, 1.50 = anguria). Più basso = più aromatico. Stima in base all'intensità aromatica del frutto rispetto alla fragola."
				},
				sugarPercent: {
					type: "number",
					minimum: 0,
					maximum: 100,
					description: "g zuccheri per 100 g di frutto fresco. Cerca il valore nutrizionale online."
				},
				waterPercent: {
					type: "number",
					minimum: 0,
					maximum: 100,
					description: "g acqua per 100 g di frutto fresco. Cerca il valore nutrizionale online."
				},
				typicalBrix: {
					type: "number",
					minimum: 0,
					maximum: 100,
					description: "°Brix approssimativo del frutto fresco (soluble solids). Tipicamente ~zuccheri% + 3-5 per altri solidi solubili."
				},
				ph: {
					type: "number",
					minimum: 0,
					maximum: 14,
					description: "pH del frutto fresco. Cerca online."
				},
				notes: {
					type: "string",
					default: ""
				}
			},
			required: [
				"name",
				"factor",
				"sugarPercent",
				"waterPercent",
				"typicalBrix",
				"ph"
			],
			additionalProperties: false
		},
		batch_size_liters: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Volume attuale della birra dopo gli altri frutti e prima del frutto principale (L)."
		},
		intensity: {
			type: "string",
			enum: [
				"accenno",
				"leggero",
				"medio",
				"intenso",
				"estremo"
			],
			default: "leggero"
		},
		fruit_form: {
			type: "string",
			enum: [
				"fresh",
				"puree",
				"juice",
				"concentrate",
				"lyophilized",
				"dried"
			],
			default: "fresh"
		},
		addition_method: {
			type: "string",
			enum: [
				"secondary",
				"whirlpool",
				"end_boil",
				"mash",
				"tincture",
				"keg"
			],
			default: "secondary"
		},
		beer_style: {
			type: "string",
			enum: [
				"sour",
				"ipa",
				"stout",
				"wheat",
				"blonde",
				"saison",
				"belgian",
				"lager",
				"neipa",
				"other"
			],
			default: "other"
		},
		initial_abv: {
			type: "number",
			minimum: 0,
			maximum: 20,
			description: "ABV della birra DOPO gli altri frutti, PRIMA del frutto principale (opzionale)."
		},
		tincture_alcohol_abv: {
			type: "number",
			minimum: .4,
			maximum: .96,
			default: .95,
			description: "Titolo alcool per tintura (es. 0.95 per 95°)."
		},
		tincture_ml_per_g: {
			type: "number",
			exclusiveMinimum: 0,
			default: 1.3,
			description: "mL alcool per g di substrato secco."
		},
		other_fruits: {
			type: "array",
			items: {
				type: "object",
				properties: {
					fruit_name: {
						type: "string",
						minLength: 1
					},
					fresh_equivalent_kg: {
						type: "number",
						exclusiveMinimum: 0
					},
					addition_method: {
						type: "string",
						enum: [
							"secondary",
							"whirlpool",
							"end_boil",
							"mash",
							"keg"
						],
						default: "secondary"
					},
					fruit_params: {
						type: "object",
						description: "⚠️ Obbligatorio se il frutto non è nel database. Cerca online e compila.",
						properties: {
							name: {
								type: "string",
								minLength: 1
							},
							factor: {
								type: "number",
								exclusiveMinimum: 0
							},
							sugarPercent: {
								type: "number",
								minimum: 0,
								maximum: 100
							},
							waterPercent: {
								type: "number",
								minimum: 0,
								maximum: 100
							},
							typicalBrix: {
								type: "number",
								minimum: 0,
								maximum: 100
							},
							ph: {
								type: "number",
								minimum: 0,
								maximum: 14
							},
							notes: {
								type: "string",
								default: ""
							}
						},
						required: [
							"name",
							"factor",
							"sugarPercent",
							"waterPercent",
							"typicalBrix",
							"ph"
						],
						additionalProperties: false
					}
				},
				required: ["fruit_name", "fresh_equivalent_kg"],
				additionalProperties: false
			},
			default: []
		},
		show_details: {
			type: "boolean",
			default: true
		}
	},
	required: ["fruit_name", "batch_size_liters"],
	additionalProperties: false
};
var FruitCalculatorTool = class {
	name = "fruit_calculator";
	description = [
		"Stima il dosaggio di frutta per fruit beers (intervallo, non quantità esatta). Conversione tra formati specifica per frutto. Supporta più frutti con potenza aromatica individuale, ABV iniziale per stima ABV finale, e tintura con parametri propri.",
		"",
		"⚠️ ISTRUZIONE IMPORTANTE: se il frutto richiesto dall'utente NON è presente nel database interno (riceverai un errore \"non trovato nel database\"), DEVI cercare online i valori nutrizionali del frutto (zuccheri g/100g, acqua g/100g, pH) e stimare il fattore aromatico rispetto alla fragola (1.00), poi RIPROVARE la chiamata passando i dati trovati nel campo fruit_params. Non arrenderti al primo errore: cerca e riprova."
	].join("\n");
	parameters = FRUIT_CALCULATOR_PARAMETERS;
	resolveExecution(rawArgs) {
		const args = FruitCalculatorInputSchema.parse(rawArgs);
		return {
			description: `Fruit calc: ${args.fruit_name} @ ${args.intensity}`,
			approvalRule: this.name,
			execute: () => {
				try {
					return Promise.resolve({ output: formatResults$1(args) });
				} catch (e) {
					return Promise.resolve({
						isError: true,
						output: e instanceof Error ? e.message : String(e)
					});
				}
			}
		};
	}
};
registerTool(FruitCalculatorTool);

//#endregion
//#region src/brewing/spice-calculator.ts
/**
* Botanical adjunct calculator — estimate dosage for spices, cocoa, coffee,
* tea, herbs, peels, and woods in brewing.
*
* Separates aromatic dose (volatile terpenes/phenols) from chemesthetic dose
* (pungency, heat, cooling, astringency) because they behave differently.
* Accounts for physical form, addition stage, contact time, temperature,
* beer matrix (ABV, FG, IBU, roast, acidity), adjunct-adjunct interactions,
* freshness, and category-specific parameters (roast level for coffee,
* SHU for chili, etc.). Returns an interval with confidence level, risk flags,
* and an incremental-adjustment protocol — never a single precise number.
*
* Key caveats: essential-oil content varies enormously with origin, cultivar,
* harvest year, and storage. The database values are starting points; actual
* potency depends on your specific lot. Bench trials and incremental dosing
* are always recommended when precision matters.
*/
const WOOD_TOAST = {
	untoasted: {
		aroma: .85,
		astringency: 1.25
	},
	light: {
		aroma: 1.05,
		astringency: 1.05
	},
	medium: {
		aroma: 1.1,
		astringency: .95
	},
	heavy: {
		aroma: .95,
		astringency: .9
	}
};
const FORMS = {
	whole: {
		label: "Intero",
		volatileExtractSpeed: .3,
		nonVolatileExtractSpeed: .25,
		volatileHeatLoss: .3,
		repeatability: "low",
		overdoseRisk: "low",
		removable: true
	},
	cracked: {
		label: "Spezzato / schiacciato",
		volatileExtractSpeed: .65,
		nonVolatileExtractSpeed: .55,
		volatileHeatLoss: .5,
		repeatability: "medium",
		overdoseRisk: "low",
		removable: true
	},
	ground: {
		label: "Macinato / polvere",
		volatileExtractSpeed: 1,
		nonVolatileExtractSpeed: 1,
		volatileHeatLoss: .8,
		repeatability: "good",
		overdoseRisk: "high",
		removable: false
	},
	fresh: {
		label: "Fresco",
		volatileExtractSpeed: .8,
		nonVolatileExtractSpeed: .7,
		volatileHeatLoss: .6,
		repeatability: "low",
		overdoseRisk: "medium",
		removable: true
	},
	dried: {
		label: "Essiccato",
		volatileExtractSpeed: .55,
		nonVolatileExtractSpeed: .5,
		volatileHeatLoss: .45,
		repeatability: "medium",
		overdoseRisk: "low",
		removable: true
	}
};
const STAGES = {
	mash: {
		label: "Mash",
		volatileExtract: .4,
		nonVolatileExtract: .6,
		volatileEvaporation: .15,
		removable: true,
		tip: "I volatili delicati sopravvivono poco al mash; meglio per spezie resinose o amare."
	},
	boil: {
		label: "Bollitura",
		volatileExtract: .9,
		nonVolatileExtract: .95,
		volatileEvaporation: .85,
		removable: false,
		tip: "Massima estrazione ma forte perdita di volatili leggeri. Aggiungere a fine bollitura per preservare aromi."
	},
	whirlpool: {
		label: "Whirlpool (80-95°C)",
		volatileExtract: .75,
		nonVolatileExtract: .7,
		volatileEvaporation: .5,
		removable: true,
		tip: "Buon compromesso: estrazione senza evaporazione estrema. 15-30 min tipicamente."
	},
	fermentation: {
		label: "Fermentazione",
		volatileExtract: .6,
		nonVolatileExtract: .5,
		volatileEvaporation: .4,
		removable: false,
		tip: "Alcuni volatili vengono trascinati dalla CO₂. Aggiungere dopo la fase più attiva."
	},
	conditioning: {
		label: "Maturazione / dry-spice",
		volatileExtract: .55,
		nonVolatileExtract: .45,
		volatileEvaporation: .1,
		removable: true,
		tip: "Metodo più controllabile. Assaggiare ogni 12-24 ore. Rimuovere quando soddisfatti."
	},
	keg: {
		label: "Fusto / serving tank",
		volatileExtract: .5,
		nonVolatileExtract: .4,
		volatileEvaporation: .05,
		removable: true,
		tip: "Temperatura bassa = estrazione lenta. Usare sacchetto in acciaio per rimozione facile."
	},
	tincture: {
		label: "Tintura alcolica separata",
		volatileExtract: .95,
		nonVolatileExtract: .9,
		volatileEvaporation: 0,
		removable: false,
		tip: "Massimo controllo. Aggiungere goccia a goccia su campione, poi scalare."
	}
};
/**
* Compute per-dimension matrix factors, separated by mechanism:
* - extractionFactor: how the beer medium affects physical extraction
* - perceptionAmplification: how the beer amplifies perceived intensity
* - maskingFactor: how the beer masks or suppresses perception
*/
function computeMatrixFactors(m) {
	const abv = m.abv;
	const fg = m.finalGravity ?? 1.008;
	const abvExtraction = 1 + Math.max(0, (abv - 4.5) * .06);
	const abvPerceptionWarm = 1 + Math.max(0, (abv - 5) * .08);
	const fgMaskAroma = clamp(1 - Math.max(0, (fg - 1.008) * 1e3) * .006, .5, 1.05);
	const ibuRisk = Math.min(1, (m.ibu ?? 0) / 80);
	const roastMask = clamp(1 - m.roastIntensity * .4, .4, 1);
	const roastBoostWarm = 1 + m.roastIntensity * .3;
	const hopOverlapRisk = m.hopAromaIntensity * .5;
	const acidAmplifyBright = 1 + m.acidity * .25;
	const acidAmplifyHeat = 1 + m.acidity * .3;
	const acidAmplifyAstringency = 1 + m.acidity * .2;
	return {
		extractionFactor: abvExtraction,
		perceptionAmplification: {
			aroma: acidAmplifyBright,
			pungency: abvPerceptionWarm * acidAmplifyHeat * roastBoostWarm,
			bitterness: abvExtraction * (1 + ibuRisk * .3),
			astringency: abvExtraction * acidAmplifyAstringency * (1 + ibuRisk * .15),
			cooling: acidAmplifyBright
		},
		maskingFactor: {
			aroma: fgMaskAroma * roastMask,
			pungency: 1,
			bitterness: 1,
			astringency: 1,
			cooling: 1
		},
		hopOverlapRisk,
		roastMask
	};
}
/**
* Potency factor: >1 = more potent than reference, <1 = less potent.
* A more potent spice needs LESS grams → dose is DIVIDED by potencyFactor.
*/
function potencyMultiplier(freshness) {
	switch (freshness) {
		case "freshly_cracked": return 1.15;
		case "recent": return 1;
		case "older": return .75;
		case "unknown": return 1;
	}
}
const SPICES = [
	{
		id: "coriander_seed",
		name: "Coriandolo (seme)",
		aliases: [
			"coriandolo",
			"coriander",
			"coriander seed"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .8,
			pungency: .1,
			bitterness: .25,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 4,
			max: 8,
			recommend: 6
		},
		medium: {
			min: 8,
			max: 16,
			recommend: 12
		},
		high: {
			min: 16,
			max: 30,
			recommend: 22
		},
		keyVolatiles: [
			"linalool",
			"α-pinene",
			"γ-terpinene",
			"camphor"
		],
		keyActives: ["linalool", "geranyl acetate"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.18, 1.4],
		risks: ["Profilo saponoso/detergente se sovradosato con agrumi", "Variabilità enorme tra lotti (olio 0.18-1.40%)"],
		notes: "Schiacciare sempre prima dell'uso. Le varietà indiane sono più agrumate, quelle europee più floreali."
	},
	{
		id: "black_pepper",
		name: "Pepe nero",
		aliases: [
			"pepe nero",
			"pepe",
			"black pepper"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .65,
			pungency: .55,
			bitterness: .3,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 1,
			max: 3,
			recommend: 2
		},
		medium: {
			min: 3,
			max: 6,
			recommend: 4.5
		},
		high: {
			min: 6,
			max: 10,
			recommend: 8
		},
		keyVolatiles: [
			"β-caryophyllene",
			"limonene",
			"α-pinene",
			"β-pinene",
			"δ-3-carene"
		],
		keyActives: ["piperine"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1, 3.5],
		risks: [
			"Piperina 2-9%: due pepi uguali in g/L possono essere molto diversi",
			"Sovrapposizione terpenica con luppoli resinosi/agrumati",
			"Nota legnosa oltre 7 giorni di contatto"
		],
		notes: "Spezzare fresco prima dell'uso. Tellicherry e Sarawak hanno profili molto diversi. Per dry-spice, rimuovere entro 5-7 giorni."
	},
	{
		id: "sichuan_pepper",
		name: "Pepe di Sichuan",
		aliases: [
			"sichuan",
			"sichuan pepper",
			"pepe di sichuan",
			"sancho"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .6,
			pungency: .5,
			bitterness: .15,
			astringency: .55,
			cooling: .45
		},
		low: {
			min: 1,
			max: 3,
			recommend: 2
		},
		medium: {
			min: 3,
			max: 6,
			recommend: 4.5
		},
		high: {
			min: 6,
			max: 10,
			recommend: 8
		},
		keyVolatiles: [
			"geraniol",
			"limonene",
			"citronellal",
			"linalool"
		],
		keyActives: ["hydroxy-α-sanshool", "hydroxy-β-sanshool"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1.5, 4],
		risks: ["Effetto anestetizzante/tingling cumulativo con altre spezie pungenti", "Sapore metallico se sovradosato"],
		notes: "Aggiunge un effetto \"buzz\" unico. Si sposa bene con agrumi e coriandolo. Rimuovere dopo 3-5 giorni."
	},
	{
		id: "cinnamon",
		name: "Cannella",
		aliases: ["cannella", "cinnamon"],
		category: "spice",
		referenceForm: "whole",
		profile: {
			aroma: .75,
			pungency: .3,
			bitterness: .35,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 2,
			max: 5,
			recommend: 3.5
		},
		medium: {
			min: 5,
			max: 10,
			recommend: 7.5
		},
		high: {
			min: 10,
			max: 18,
			recommend: 14
		},
		keyVolatiles: [
			"cinnamaldehyde",
			"eugenol",
			"linalool"
		],
		keyActives: ["cinnamaldehyde", "coumarin"],
		risks: [
			"La cannella Cassia contiene cumarina (tossicità epatica ad alte dosi). Preferire Ceylon per dosaggi alti.",
			"Astringenza fastidiosa oltre 10 g/20L in stecca",
			"Può dominare tutto oltre i 15 g/20L"
		],
		notes: "Usare stecche intere in infusione, rimuovere dopo 3-5 giorni. La polvere è difficile da rimuovere e torbida.",
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		}
	},
	{
		id: "clove",
		name: "Chiodo di garofano",
		aliases: [
			"chiodi di garofano",
			"chiodo",
			"clove",
			"cloves"
		],
		category: "spice",
		referenceForm: "whole",
		profile: {
			aroma: .95,
			pungency: .4,
			bitterness: .5,
			astringency: .7,
			cooling: .05
		},
		low: {
			min: .2,
			max: .6,
			recommend: .4
		},
		medium: {
			min: .6,
			max: 1.2,
			recommend: .9
		},
		high: {
			min: 1.2,
			max: 2,
			recommend: 1.5
		},
		keyVolatiles: [
			"eugenol",
			"β-caryophyllene",
			"eugenyl acetate"
		],
		keyActives: ["eugenol"],
		perceptionProfile: "persistent",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [14, 20],
		risks: [
			"CURVA RIPIDA: la distanza tra riconoscibile e dominante è minuscola",
			"Può anestetizzare il palato mascherando altre spezie",
			"Eugenolo dominante: copre aromi delicati"
		],
		notes: "Dosare con estrema cautela. Per 20L, iniziare con 2-3 chiodi, assaggiare dopo 24 ore."
	},
	{
		id: "star_anise",
		name: "Anice stellato",
		aliases: [
			"anice stellato",
			"star anise",
			"badiana"
		],
		category: "spice",
		referenceForm: "whole",
		profile: {
			aroma: .85,
			pungency: .1,
			bitterness: .3,
			astringency: .45,
			cooling: 0
		},
		low: {
			min: .5,
			max: 1.5,
			recommend: 1
		},
		medium: {
			min: 1.5,
			max: 4,
			recommend: 2.5
		},
		high: {
			min: 4,
			max: 8,
			recommend: 6
		},
		keyVolatiles: [
			"anethole",
			"estragole",
			"limonene",
			"linalool"
		],
		keyActives: ["anethole"],
		perceptionProfile: "building",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [5, 9],
		risks: [
			"CURVA RIPIDA come il chiodo di garofano",
			"L'anetolo è molto persistente e può coprire tutto",
			"Sapore medicinale se sovradosato"
		],
		notes: "1-2 stelle per 20L come punto di partenza. Aggiungere in infusione rimovibile."
	},
	{
		id: "ginger",
		name: "Zenzero",
		aliases: ["zenzero", "ginger"],
		category: "spice",
		referenceForm: "fresh",
		profile: {
			aroma: .55,
			pungency: .6,
			bitterness: .2,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 10,
			max: 25,
			recommend: 18
		},
		medium: {
			min: 25,
			max: 60,
			recommend: 40
		},
		high: {
			min: 60,
			max: 120,
			recommend: 90
		},
		keyVolatiles: [
			"zingiberene",
			"β-sesquiphellandrene",
			"α-curcumene",
			"citral"
		],
		keyActives: [
			"gingerol",
			"shogaol",
			"zingerone"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 3],
		risks: [
			"Pungenza cumulativa con pepe/peperoncino",
			"Il fresco e il secco hanno profili molto diversi (gingerol vs shogaol)",
			"Nota terrosa oltre 10 giorni di contatto"
		],
		notes: "Fresco: sbucciare e affettare sottile. Secco in polvere: ~1/4 del peso fresco. Per dry-spice, rimuovere entro 5-7 giorni."
	},
	{
		id: "chili",
		name: "Peperoncino",
		aliases: [
			"peperoncino",
			"chili",
			"chili pepper",
			"chile"
		],
		category: "spice",
		referenceForm: "dried",
		profile: {
			aroma: .35,
			pungency: .95,
			bitterness: .25,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 0,
			max: 0,
			recommend: 0
		},
		medium: {
			min: 0,
			max: 0,
			recommend: 0
		},
		high: {
			min: 0,
			max: 0,
			recommend: 0
		},
		keyVolatiles: ["variable by cultivar"],
		keyActives: ["capsaicin", "dihydrocapsaicin"],
		perceptionProfile: "building",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.1, 1],
		risks: [
			"IMPOSSIBILE DOSARE SENZA SHU O VARIETÀ. Restituisce intervallo ampio e incerto.",
			"Pungenza cumulativa con zenzero e pepe nero",
			"La capsaicina è liposolubile: birra più alcolica = estrazione più efficiente"
		],
		notes: "SENZA SHU o varietà il calcolo è puramente indicativo. Fornire capsaicinoids_mg_per_g o SHU per stima utile. Ancho/pasilla = poco piccante, habanero = estremamente piccante."
	},
	{
		id: "cardamom",
		name: "Cardamomo verde",
		aliases: [
			"cardamomo",
			"cardamom",
			"cardamomo verde"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .7,
			pungency: .15,
			bitterness: .2,
			astringency: .25,
			cooling: .1
		},
		low: {
			min: 1,
			max: 3,
			recommend: 2
		},
		medium: {
			min: 3,
			max: 7,
			recommend: 5
		},
		high: {
			min: 7,
			max: 12,
			recommend: 9
		},
		keyVolatiles: [
			"1,8-cineole",
			"α-terpinyl acetate",
			"limonene",
			"linalool"
		],
		keyActives: ["1,8-cineole"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [2.5, 8],
		risks: ["Può diventare medicinale/farmaceutico a dosi alte", "L'1,8-cineolo è dominante e può stancare"],
		notes: "Schiacciare i baccelli, usare solo i semi. Aggiungere a whirlpool o in infusione post-fermento."
	},
	{
		id: "nutmeg",
		name: "Noce moscata",
		aliases: ["noce moscata", "nutmeg"],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .6,
			pungency: .35,
			bitterness: .35,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: .5,
			max: 2,
			recommend: 1
		},
		medium: {
			min: 2,
			max: 5,
			recommend: 3.5
		},
		high: {
			min: 5,
			max: 10,
			recommend: 7
		},
		keyVolatiles: [
			"myristicin",
			"sabinene",
			"α-pinene",
			"β-pinene",
			"terpinen-4-ol"
		],
		keyActives: ["myristicin", "elemicin"],
		perceptionProfile: "building",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [5, 15],
		risks: ["La miristicina ha effetti psicotropi a dosi molto alte (>>10g)", "Grattugiare fresco: la polvere pre-macinata perde aroma in giorni"],
		notes: "Grattugiare al momento. Microplane o grattugia fine. In infusione, rimuovere dopo 3-5 giorni."
	},
	{
		id: "mace",
		name: "Macis",
		aliases: ["macis", "mace"],
		category: "spice",
		referenceForm: "dried",
		profile: {
			aroma: .55,
			pungency: .25,
			bitterness: .3,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: .5,
			max: 1.5,
			recommend: 1
		},
		medium: {
			min: 1.5,
			max: 4,
			recommend: 2.5
		},
		high: {
			min: 4,
			max: 8,
			recommend: 6
		},
		keyVolatiles: [
			"myristicin",
			"α-pinene",
			"sabinene",
			"terpinen-4-ol"
		],
		keyActives: ["myristicin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [4, 12],
		risks: ["Più delicato della noce moscata ma simile profilo di rischio", "Può dare note legnose persistenti"],
		notes: "Aroma più fine e floreale della noce moscata. Si sposa bene con birre chiare e speziate."
	},
	{
		id: "vanilla",
		name: "Vaniglia",
		aliases: ["vaniglia", "vanilla"],
		category: "spice",
		referenceForm: "whole",
		profile: {
			aroma: .65,
			pungency: 0,
			bitterness: .1,
			astringency: .05,
			cooling: 0
		},
		low: {
			min: .5,
			max: 1.5,
			recommend: 1
		},
		medium: {
			min: 1.5,
			max: 4,
			recommend: 2.5
		},
		high: {
			min: 4,
			max: 8,
			recommend: 6
		},
		keyVolatiles: ["vanillin", "4-hydroxybenzaldehyde"],
		keyActives: ["vanillin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1.5, 3.5],
		risks: ["L'estratto artificiale ha profilo piatto vs bacca intera", "Aroma mascherato da malti tostati e luppoli intensi"],
		notes: "Bacca intera: incidere longitudinalmente, infusione 7-14 giorni. Estratto: usare poche gocce, assaggiare. Tintura fatta in casa: 2 bacche in 50 mL alcool per 2 settimane."
	},
	{
		id: "fennel_seed",
		name: "Finocchio (seme)",
		aliases: [
			"finocchio",
			"fennel",
			"fennel seed"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .7,
			pungency: .05,
			bitterness: .15,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 2,
			max: 5,
			recommend: 3.5
		},
		medium: {
			min: 5,
			max: 12,
			recommend: 8
		},
		high: {
			min: 12,
			max: 20,
			recommend: 16
		},
		keyVolatiles: [
			"anethole",
			"estragole",
			"fenchone",
			"α-pinene"
		],
		keyActives: ["anethole"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1.5, 6],
		risks: ["L'anetolo è dominante e persistente", "Sapore medicinale se sovradosato"],
		notes: "Schiacciare leggermente. Si sposa bene con coriandolo in Witbier e Saison."
	},
	{
		id: "grains_of_paradise",
		name: "Grani del paradiso / Maniguetta",
		aliases: [
			"grani del paradiso",
			"maniguetta",
			"grains of paradise",
			"melegueta"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .55,
			pungency: .5,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 1,
			max: 3,
			recommend: 2
		},
		medium: {
			min: 3,
			max: 7,
			recommend: 5
		},
		high: {
			min: 7,
			max: 12,
			recommend: 9
		},
		keyVolatiles: [
			"β-caryophyllene",
			"limonene",
			"α-pinene",
			"α-humulene"
		],
		keyActives: [
			"paradol",
			"gingerol",
			"shogaol"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 2],
		risks: ["Pungenza cumulativa", "Può dominare birre delicate"],
		notes: "Sapore tra pepe e zenzero con note agrumate. Ottimo in Saison e Belgian ale."
	},
	{
		id: "allspice",
		name: "Pimento / Pepe della Giamaica",
		aliases: [
			"pimento",
			"pepe della giamaica",
			"allspice",
			"pimenta"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .7,
			pungency: .3,
			bitterness: .25,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 1,
			max: 3,
			recommend: 2
		},
		medium: {
			min: 3,
			max: 7,
			recommend: 5
		},
		high: {
			min: 7,
			max: 12,
			recommend: 9
		},
		keyVolatiles: [
			"eugenol",
			"β-caryophyllene",
			"methyl eugenol",
			"cineole"
		],
		keyActives: ["eugenol"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [2.5, 4.5],
		risks: ["Ricorda cannella + chiodo + noce moscata: può creare ridondanza con queste spezie"],
		notes: "Aroma complesso \"tuttospezie\". Ottimo in birre natalizie e stout speziate."
	},
	{
		id: "orange_peel",
		name: "Scorza d'arancia",
		aliases: [
			"scorza arancia",
			"orange peel",
			"bucce arancia",
			"scorza d'arancia"
		],
		category: "peel",
		referenceForm: "dried",
		profile: {
			aroma: .7,
			pungency: 0,
			bitterness: .35,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 3,
			max: 8,
			recommend: 5
		},
		medium: {
			min: 8,
			max: 20,
			recommend: 14
		},
		high: {
			min: 20,
			max: 40,
			recommend: 30
		},
		keyVolatiles: [
			"limonene",
			"citral",
			"linalool",
			"α-pinene"
		],
		keyActives: ["limonene"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 3],
		risks: ["Profilo saponoso/detergente se sovradosata con coriandolo", "L'amaro della scorza può sommarsi agli IBU"],
		notes: "Solo scorza, no albedo (parte bianca = amaro sgradevole). Se fresca, ~2x il peso del secco. Curacao = più aromatica, Valencia = più dolce."
	},
	{
		id: "lemon_peel",
		name: "Scorza di limone",
		aliases: [
			"scorza limone",
			"lemon peel",
			"bucce limone"
		],
		category: "peel",
		referenceForm: "dried",
		profile: {
			aroma: .7,
			pungency: 0,
			bitterness: .2,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 3,
			max: 8,
			recommend: 5
		},
		medium: {
			min: 8,
			max: 20,
			recommend: 14
		},
		high: {
			min: 20,
			max: 40,
			recommend: 30
		},
		keyVolatiles: [
			"limonene",
			"citral",
			"β-pinene",
			"γ-terpinene"
		],
		keyActives: ["limonene", "citral"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 2.5],
		risks: ["Aroma meno persistente dell'arancia in birra", "Simile rischio saponoso con coriandolo"],
		notes: "Solo scorza, no albedo. Eccellente in Witbier con coriandolo. Fresca ~2x il secco."
	},
	{
		id: "long_pepper",
		name: "Pepe lungo",
		aliases: [
			"pepe lungo",
			"long pepper",
			"pippali"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .5,
			pungency: .7,
			bitterness: .3,
			astringency: .45,
			cooling: 0
		},
		low: {
			min: .5,
			max: 2,
			recommend: 1
		},
		medium: {
			min: 2,
			max: 5,
			recommend: 3.5
		},
		high: {
			min: 5,
			max: 10,
			recommend: 7
		},
		keyVolatiles: [
			"β-caryophyllene",
			"limonene",
			"sabinene",
			"α-pinene"
		],
		keyActives: ["piperine", "piperlongumine"],
		perceptionProfile: "building",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1, 3],
		risks: ["Più potente del pepe nero: CURVA RIPIDA", "Pungenza che si accumula lentamente ma intensamente"],
		notes: "Usare con cautela. Più complesso e persistente del pepe nero. Ottimo in stout e porter."
	},
	{
		id: "tonka_bean",
		name: "Fava tonka",
		aliases: [
			"fava tonka",
			"tonka",
			"tonka bean"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .6,
			pungency: 0,
			bitterness: .2,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: .3,
			max: 1,
			recommend: .5
		},
		medium: {
			min: 1,
			max: 2,
			recommend: 1.5
		},
		high: {
			min: 2,
			max: 4,
			recommend: 3
		},
		keyVolatiles: ["coumarin", "dihydrocoumarin"],
		keyActives: ["coumarin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1, 3],
		risks: ["Contiene cumarina (epatotossica ad alte dosi). Non superare 4 g/20L.", "Aroma molto persistente. 1 fava per 20L può bastare."],
		notes: "Microplane o grattugia fine. Aroma tra vaniglia, mandorla e fieno. Attenzione: la cumarina è regolamentata in alcuni paesi."
	},
	{
		id: "juniper",
		name: "Ginepro (bacche)",
		aliases: [
			"ginepro",
			"juniper",
			"bacche di ginepro"
		],
		category: "spice",
		referenceForm: "cracked",
		profile: {
			aroma: .6,
			pungency: .25,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 2,
			max: 6,
			recommend: 4
		},
		medium: {
			min: 6,
			max: 15,
			recommend: 10
		},
		high: {
			min: 15,
			max: 30,
			recommend: 22
		},
		keyVolatiles: [
			"α-pinene",
			"myrcene",
			"limonene",
			"terpinen-4-ol"
		],
		keyActives: ["α-pinene", "myrcene"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 2.5],
		risks: ["Può dominare birre delicate con note resinose/piney", "Rischio di sovrapposizione con luppoli resinosi/terrosi"],
		notes: "Schiacciare leggermente. Ottimo in Saison, Farmhouse e birre affumicate."
	},
	{
		id: "cocoa_nibs",
		name: "Cacao in granella (nibs)",
		aliases: [
			"cacao",
			"cocoa nibs",
			"granella di cacao",
			"nibs di cacao"
		],
		category: "cocoa",
		referenceForm: "cracked",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 120,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .55,
			pungency: 0,
			bitterness: .5,
			astringency: .55,
			cooling: 0
		},
		low: {
			min: 20,
			max: 50,
			recommend: 35
		},
		medium: {
			min: 50,
			max: 120,
			recommend: 80
		},
		high: {
			min: 120,
			max: 250,
			recommend: 180
		},
		keyVolatiles: [
			"pyrazines",
			"aldehydes",
			"methylbutanal",
			"phenylacetaldehyde"
		],
		keyActives: [
			"theobromine",
			"caffeine",
			"cocoa polyphenols"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: .65,
			nonVolatileRateMultiplier: .75
		},
		fatRangePercent: [48, 55],
		risks: [
			"Alto contenuto di grassi (48-55%): può ridurre ritenzione schiuma",
			"Theobromina e caffeina: amaro persistente",
			"Astringenza elevata con contatto prolungato oltre 7gg"
		],
		notes: "Aroma cioccolato/toast/nocciola. Per stout/porter: 50-120 g/20L. Tostare leggermente prima dell'uso per amplificare l'aroma. Rimuovere dopo 5-7gg."
	},
	{
		id: "cocoa_powder",
		name: "Cacao in polvere (naturale)",
		aliases: [
			"cacao in polvere",
			"cocoa powder",
			"polvere di cacao"
		],
		category: "cocoa",
		referenceForm: "ground",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 72,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .45,
			pungency: 0,
			bitterness: .65,
			astringency: .7,
			cooling: 0
		},
		low: {
			min: 10,
			max: 30,
			recommend: 20
		},
		medium: {
			min: 30,
			max: 80,
			recommend: 50
		},
		high: {
			min: 80,
			max: 180,
			recommend: 120
		},
		keyVolatiles: ["pyrazines", "aldehydes"],
		keyActives: [
			"theobromine",
			"caffeine",
			"cocoa polyphenols"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1.2,
			nonVolatileRateMultiplier: 1.4
		},
		fatRangePercent: [10, 22],
		risks: [
			"Più amaro e astringente dei nibs",
			"Torbidità elevata",
			"Attenzione: il cacao alcalinizzato ha profilo diverso (meno acido, più scuro)"
		],
		notes: "Polvere sgrassata (10-12% grassi). Sciogliere in acqua calda prima di aggiungere. Per stout/porter: 30-80 g/20L. Cacao alcalinizzato (olandese): colore più scuro, sapore più morbido."
	},
	{
		id: "cocoa_husk",
		name: "Bucce di cacao",
		aliases: [
			"bucce cacao",
			"cocoa husk",
			"cacao husk"
		],
		category: "cocoa",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 96,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .5,
			pungency: 0,
			bitterness: .3,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 30,
			max: 80,
			recommend: 50
		},
		medium: {
			min: 80,
			max: 200,
			recommend: 140
		},
		high: {
			min: 200,
			max: 400,
			recommend: 300
		},
		keyVolatiles: ["pyrazines", "vanillin"],
		keyActives: ["theobromine", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		fatRangePercent: [1, 4],
		risks: ["Più delicate dei nibs: aroma meno intenso", "Tannini: astringenza se contatto prolungato"],
		notes: "Aroma più floreale e meno amaro dei nibs. Ottime in saison e birre chiare. Rimuovere dopo 3-5gg."
	},
	{
		id: "coffee_beans",
		name: "Caffè in grani (interi)",
		aliases: [
			"caffè",
			"coffee",
			"caffè in grani",
			"coffee beans",
			"chicchi caffè"
		],
		category: "coffee",
		referenceForm: "whole",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 36,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .6,
			pungency: 0,
			bitterness: .45,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 15,
			max: 40,
			recommend: 25
		},
		medium: {
			min: 40,
			max: 100,
			recommend: 70
		},
		high: {
			min: 100,
			max: 200,
			recommend: 150
		},
		keyVolatiles: [
			"furfuryl mercaptan",
			"pyrazines",
			"guaiacol",
			"2-methylbutanal"
		],
		keyActives: [
			"caffeine",
			"chlorogenic acids",
			"trigonelline"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: .45,
			nonVolatileRateMultiplier: .35
		},
		fatRangePercent: [12, 18],
		risks: [
			"I grani interi estraggono lentamente: 24-48h minime",
			"Tostatura scura = più amaro e meno acido",
			"Caffeina: amaro persistente ad alte dosi"
		],
		notes: "Grani interi: estrazione lenta, aroma delicato. Per dry-bean: 40-100 g/20L, 24-48h. Usare roast_level per aggiustare il profilo. Light roast = più acido/fruttato, dark = più tostato/amaro."
	},
	{
		id: "coffee_ground",
		name: "Caffè macinato (grosso)",
		aliases: [
			"caffè macinato",
			"coarse ground coffee",
			"caffè macinato grosso"
		],
		category: "coffee",
		referenceForm: "cracked",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 18,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .7,
			pungency: 0,
			bitterness: .6,
			astringency: .55,
			cooling: 0
		},
		low: {
			min: 15,
			max: 40,
			recommend: 25
		},
		medium: {
			min: 40,
			max: 100,
			recommend: 65
		},
		high: {
			min: 100,
			max: 180,
			recommend: 130
		},
		keyVolatiles: [
			"furfuryl mercaptan",
			"pyrazines",
			"guaiacol",
			"2-methylbutanal"
		],
		keyActives: ["caffeine", "chlorogenic acids"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1.35,
			nonVolatileRateMultiplier: 1.5
		},
		fatRangePercent: [12, 18],
		risks: [
			"Macinatura fine = sovra-estrazione rapida e torbidità",
			"La macinatura da french press/cold brew è ideale",
			"Contatto >24h a temperatura ambiente può estrarre tannini sgradevoli"
		],
		notes: "Macinatura grossa (french press). Aggiungere in sacchetto, rimuovere dopo 12-24h. Per coffee stout: 70-180 g/20L. Light roast = acidità e frutta, dark roast = tostato e cioccolato amaro."
	},
	{
		id: "cold_brew_coffee",
		name: "Cold brew coffee (concentrato)",
		aliases: [
			"cold brew",
			"cold brew coffee",
			"caffè cold brew"
		],
		category: "coffee",
		referenceForm: "fresh",
		doseUnit: "ml",
		deliveryMode: "direct_liquid_dose",
		profile: {
			aroma: .65,
			pungency: 0,
			bitterness: .3,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 100,
			max: 250,
			recommend: 180
		},
		medium: {
			min: 250,
			max: 600,
			recommend: 400
		},
		high: {
			min: 600,
			max: 1200,
			recommend: 900
		},
		keyVolatiles: ["pyrazines", "furfuryl derivatives"],
		keyActives: ["caffeine", "chlorogenic acids"],
		perceptionProfile: "immediate",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Attenzione: il dosaggio è in mL, non in grammi",
			"Aggiunge liquido: considerare la diluizione",
			"Concentrazione non standard: specificare il rapporto caffè/acqua usato"
		],
		notes: "Dosaggio espresso in mL di concentrato, non in grammi di caffè. Preparare con rapporto 1:5 caffè/acqua, 18-24h a 4°C. Esempio: 200g caffè in 1L acqua fredda per 24h."
	},
	{
		id: "earl_grey_tea",
		name: "Tè Earl Grey",
		aliases: ["earl grey", "earl grey tea"],
		category: "tea",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 36,
			temperatureCelsius: 4
		},
		profile: {
			aroma: .55,
			pungency: 0,
			bitterness: .35,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 10,
			max: 25,
			recommend: 18
		},
		medium: {
			min: 25,
			max: 60,
			recommend: 40
		},
		high: {
			min: 60,
			max: 120,
			recommend: 90
		},
		keyVolatiles: [
			"bergamot oil",
			"linalool",
			"limonene",
			"linalyl acetate"
		],
		keyActives: ["caffeine", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 1.5],
		risks: ["Bergamotto dominante a dosi alte", "Tannini: astringenza con infusione a caldo o contatto prolungato"],
		notes: "Aggiungere a freddo (dry-tea) per 24-48h per minimizzare tannini. Per infusione a caldo: 10-15 min a 80°C. Ottimo in saison, witbier e pale ale."
	},
	{
		id: "green_tea",
		name: "Tè verde",
		aliases: ["tè verde", "green tea"],
		category: "tea",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 24,
			temperatureCelsius: 4
		},
		profile: {
			aroma: .35,
			pungency: 0,
			bitterness: .35,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 10,
			max: 30,
			recommend: 20
		},
		medium: {
			min: 30,
			max: 80,
			recommend: 50
		},
		high: {
			min: 80,
			max: 160,
			recommend: 120
		},
		keyVolatiles: [
			"hexanal",
			"linalool",
			"geraniol"
		],
		keyActives: [
			"caffeine",
			"catechins",
			"EGCG"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1.3,
			nonVolatileRateMultiplier: 1.6
		},
		oilRangePercent: [.3, 1],
		risks: ["Molto sensibile alla temperatura: >80°C produce amaro eccessivo", "Catechine: astringenza marcata con infusione prolungata"],
		notes: "Dry-tea a freddo (24h) o infusione a 70°C per 10 min max. Ottimo in IPA e lager per note erbacee e fresche."
	},
	{
		id: "chamomile",
		name: "Camomilla",
		aliases: ["camomilla", "chamomile"],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 36,
			temperatureCelsius: 4
		},
		profile: {
			aroma: .4,
			pungency: 0,
			bitterness: .15,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 5,
			max: 15,
			recommend: 10
		},
		medium: {
			min: 15,
			max: 40,
			recommend: 25
		},
		high: {
			min: 40,
			max: 80,
			recommend: 60
		},
		keyVolatiles: [
			"α-bisabolol",
			"chamazulene",
			"bisabolol oxides"
		],
		keyActives: ["apigenin", "bisabolol"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.3, 1.5],
		risks: ["Aroma delicato: facilmente mascherato da luppoli e malti tostati"],
		notes: "Floreale, miele, mela. Ottima in witbier, saison e blonde ale. Infusione a freddo 24-48h o a caldo 10 min a 80°C."
	},
	{
		id: "hibiscus",
		name: "Ibisco / Karkadè",
		aliases: [
			"ibisco",
			"karkadè",
			"hibiscus",
			"hibiscus tea"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 24,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .35,
			pungency: 0,
			bitterness: .25,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 10,
			max: 30,
			recommend: 20
		},
		medium: {
			min: 30,
			max: 80,
			recommend: 50
		},
		high: {
			min: 80,
			max: 150,
			recommend: 110
		},
		keyVolatiles: [
			"geraniol",
			"linalool",
			"hexanal"
		],
		keyActives: [
			"anthocyanins",
			"hibiscus acid",
			"citric acid",
			"malic acid"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.2, .8],
		risks: ["Colore rosso intenso: può dominare visivamente", "Acidità percepita: può sembrare più acida di quanto sia"],
		notes: "Colore rosso brillante, sapore acidulo-fruttato. Ottimo in sour, gose e berliner weisse. Infusione a freddo per colore più brillante."
	},
	{
		id: "coconut",
		name: "Cocco",
		aliases: [
			"cocco",
			"coconut",
			"cocco essiccato",
			"coconut flakes",
			"cocco grattugiato",
			"cocco rapè"
		],
		category: "spice",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 120,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .6,
			pungency: 0,
			bitterness: .05,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 50,
			max: 120,
			recommend: 80
		},
		medium: {
			min: 120,
			max: 300,
			recommend: 200
		},
		high: {
			min: 300,
			max: 600,
			recommend: 450
		},
		keyVolatiles: [
			"δ-decalactone",
			"δ-octalactone",
			"methyl ketones"
		],
		keyActives: ["fatty acids", "medium-chain triglycerides"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: .8,
			nonVolatileRateMultiplier: .5
		},
		fatRangePercent: [60, 70],
		risks: [
			"Altissimo contenuto di grassi (60-70%): impatto significativo sulla ritenzione schiuma",
			"Irrancidimento possibile se conservato a lungo: usare solo cocco fresco",
			"Il cocco tostato ha profilo più intenso e meno grasso del crudo"
		],
		notes: "Cocco essiccato in scaglie o grattugiato. Tostare leggermente in forno a 150°C per 10-15 min per intensificare l'aroma. A contatto prolungato oltre 10gg può rilasciare note untuose. Ottimo in stout, porter e birre tropicali."
	},
	{
		id: "oak_chips",
		name: "Chips di rovere",
		aliases: [
			"rovere",
			"oak chips",
			"chips rovere"
		],
		category: "wood",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 240,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .45,
			pungency: 0,
			bitterness: .25,
			astringency: .45,
			cooling: 0
		},
		low: {
			min: 5,
			max: 15,
			recommend: 10
		},
		medium: {
			min: 15,
			max: 40,
			recommend: 25
		},
		high: {
			min: 40,
			max: 80,
			recommend: 55
		},
		keyVolatiles: [
			"vanillin",
			"whisky lactone",
			"eugenol",
			"furfural"
		],
		keyActives: ["tannins", "lignins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: .25,
			nonVolatileRateMultiplier: .3
		},
		risks: ["Tostatura influenza il profilo: light = più vaniglia/cocco, dark = più tostato/affumicato", "Tannini: astringenza con contatto prolungato oltre 14gg"],
		notes: "Vaniglia, cocco, tostato, speziato. Tostare le chips in forno prima dell'uso per amplificare aromi. Contatto 7-14gg, assaggiare ogni 2-3gg."
	},
	{
		id: "ale_cost",
		name: "Alecost",
		aliases: [
			"alecost",
			"costmary",
			"tanacetum balsamita"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .45,
			pungency: 0,
			bitterness: .25,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"camphor",
			"thujone",
			"1,8-cineole"
		],
		keyActives: ["tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma balsamico che può dominare birre delicate", "Thujone: usare con moderazione"],
		notes: "Foglie essiccate. Aroma balsamico-mentolato, simile alla menta ma più erbaceo. Storicamente usato nelle ale inglesi prima del luppolo."
	},
	{
		id: "anise_hyssop",
		name: "Anice issopo",
		aliases: [
			"anice issopo",
			"anise hyssop",
			"agastache foeniculum"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .25,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .65,
			pungency: 0,
			bitterness: .15,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"estragole",
			"methyl chavicol",
			"limonene"
		],
		keyActives: ["estragole"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["L'estragole ricorda l'anice: può creare ridondanza con anice stellato o finocchio"],
		notes: "Fiori essiccati. Aroma di anice e liquirizia con note floreali. Ottimo in Saison e Farmhouse ale."
	},
	{
		id: "bitter_orange_peel",
		name: "Scorza d'arancia amara",
		aliases: [
			"scorza arancia amara",
			"bitter orange peel",
			"curaçao peel",
			"arancia amara"
		],
		category: "peel",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .25,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .65,
			pungency: 0,
			bitterness: .4,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"limonene",
			"citral",
			"linalool",
			"neohesperidin"
		],
		keyActives: ["neohesperidin", "naringin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 2.5],
		risks: ["Più amara della scorza dolce: il neohesperidina contribuisce all'amaro", "L'amaro può sommarsi agli IBU"],
		notes: "Scorza essiccata di arancia amara (Curaçao). Aroma più intenso e complesso della scorza dolce. Classica nelle Belgian ale. Solo scorza, no albedo."
	},
	{
		id: "cowslip",
		name: "Primula odorosa",
		aliases: [
			"primula",
			"cowslip",
			"primula veris"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .25,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .4,
			pungency: 0,
			bitterness: .15,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"methyl salicylate",
			"benzyl alcohol",
			"linalool"
		],
		keyActives: ["saponins", "flavonoids"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma molto delicato: facilmente mascherato da luppoli e malti tostati"],
		notes: "Fiori essiccati. Aroma floreale dolce e delicato. Usata storicamente in birre primaverili inglesi."
	},
	{
		id: "dandelion",
		name: "Tarassaco (foglia)",
		aliases: [
			"tarassaco",
			"dandelion",
			"dente di leone"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .25,
			pungency: 0,
			bitterness: .55,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: ["hexanal", "phenylacetaldehyde"],
		keyActives: [
			"taraxacin",
			"inulin",
			"sesquiterpene lactones"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Amarezza significativa: il taraxacin è molto amaro", "Può aggiungere un amaro terroso/vegetale"],
		notes: "Foglie essiccate. Amaro erbaceo e terroso. Tradizionalmente usato in birre stagionali primaverili e come sostituto parziale del luppolo."
	},
	{
		id: "elderberry_flower",
		name: "Fiori di sambuco",
		aliases: [
			"sambuco",
			"elderberry flower",
			"elderflower",
			"fiori di sambuco"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 48,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .6,
			pungency: 0,
			bitterness: .1,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"linalool",
			"hotrienol",
			"cis-rose oxide",
			"phenylacetaldehyde"
		],
		keyActives: ["flavonoids", "chlorogenic acid"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma floreale intenso: può dominare birre delicate", "I fiori freschi contengono tracce di glicosidi cianogenici (innocui dopo essiccazione/ebollizione)"],
		notes: "Fiori essiccati. Aroma floreale, miele, uva moscato. Ottimo in Saison, witbier e blonde ale. Infusione a freddo 24-48h per massimo aroma."
	},
	{
		id: "elecampane",
		name: "Enula campana",
		aliases: [
			"enula",
			"elecampane",
			"inula helenium"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .35,
			pungency: 0,
			bitterness: .4,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"alantolactone",
			"isoalantolactone",
			"azulene"
		],
		keyActives: ["inulin", "alantolactone"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Amarezza terrosa marcata", "Può aggiungere note medicinali a dosi alte"],
		notes: "Radice essiccata. Aroma terroso, amaro, con note di violetta. Usata storicamente in birre medicinali e amari."
	},
	{
		id: "greek_oregano",
		name: "Origano greco",
		aliases: [
			"origano",
			"greek oregano",
			"origanum vulgare"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .75,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .55,
			pungency: .15,
			bitterness: .3,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"carvacrol",
			"thymol",
			"γ-terpinene",
			"p-cymene"
		],
		keyActives: [
			"carvacrol",
			"thymol",
			"rosmarinic acid"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [1.5, 4],
		risks: ["Carvacrolo e timolo sono molto potenti: CURVA RIPIDA", "Può evocare note da cucina/pizza se sovradosato"],
		notes: "Foglie essiccate. Aroma erbaceo, caldo, leggermente piccante. Ottimo in Saison, Farmhouse e birre al miele. Dosare con cautela."
	},
	{
		id: "heather",
		name: "Erica",
		aliases: [
			"erica",
			"heather",
			"calluna vulgaris",
			"brugo"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1.5,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .5,
			pungency: 0,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 5,
			max: 20,
			recommend: 12
		},
		medium: {
			min: 20,
			max: 50,
			recommend: 35
		},
		high: {
			min: 50,
			max: 100,
			recommend: 70
		},
		keyVolatiles: [
			"β-caryophyllene",
			"germacrene D",
			"α-terpineol"
		],
		keyActives: [
			"tannins",
			"arbutin",
			"quercetin"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Astringenza significativa con bollitura prolungata", "12 cups ≈ 100g fiori secchi: volume, non peso"],
		notes: "Fiori essiccati. Aroma floreale, miele, leggermente resinoso. Ingrediente tradizionale delle Fraoch (Scottish heather ale). 12 cups ≈ 100g secchi. Bollitura 90 min tradizionale."
	},
	{
		id: "horehound",
		name: "Marrubio",
		aliases: [
			"marrubio",
			"horehound",
			"marrubium vulgare"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .3,
			pungency: 0,
			bitterness: .6,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"β-caryophyllene",
			"germacrene D",
			"α-pinene"
		],
		keyActives: ["marrubiin", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Marrubina: amarezza molto intensa e persistente", "Può facilmente dominare il profilo amaro"],
		notes: "Foglie essiccate. Amaro erbaceo intenso, usato storicamente come sostituto del luppolo e in birre medicinali. Dosare con estrema cautela."
	},
	{
		id: "hyssop",
		name: "Issopo",
		aliases: [
			"issopo",
			"hyssop",
			"hyssopus officinalis"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .5,
			pungency: .05,
			bitterness: .3,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"isopinocamphone",
			"pinocamphone",
			"β-pinene",
			"limonene"
		],
		keyActives: ["tannins", "marrubiin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma balsamico-mentolato che può dominare", "Amarezza moderata: attenzione con IBU già alti"],
		notes: "Fiori essiccati. Aroma tra menta, salvia e rosmarino. Usato storicamente in birre monastiche e amari. Ottimo in Saison."
	},
	{
		id: "juniper_leaf",
		name: "Ginepro (foglie)",
		aliases: [
			"foglie di ginepro",
			"juniper leaf",
			"juniper branches"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .5,
			pungency: .2,
			bitterness: .35,
			astringency: .4,
			cooling: 0
		},
		low: {
			min: 6,
			max: 24,
			recommend: 14
		},
		medium: {
			min: 24,
			max: 56,
			recommend: 40
		},
		high: {
			min: 56,
			max: 113,
			recommend: 80
		},
		keyVolatiles: [
			"α-pinene",
			"sabinene",
			"limonene",
			"terpinen-4-ol"
		],
		keyActives: ["tannins", "α-pinene"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Resinoso e astringente: può dominare birre delicate", "Rischio di sovrapposizione con luppoli resinosi"],
		notes: "Foglie/rametti essiccati. Più resinoso e astringente delle bacche. Tradizionalmente usato nelle Sahti e birre nordiche. Filtrare bene dopo bollitura."
	},
	{
		id: "labrador_tea",
		name: "Tè del Labrador",
		aliases: [
			"labrador tea",
			"tè del labrador",
			"ledum groenlandicum",
			"rhododendron groenlandicum"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .45,
			pungency: 0,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 6,
			max: 24,
			recommend: 14
		},
		medium: {
			min: 24,
			max: 56,
			recommend: 40
		},
		high: {
			min: 56,
			max: 113,
			recommend: 80
		},
		keyVolatiles: [
			"ledol",
			"palustrol",
			"myrcene",
			"limonene"
		],
		keyActives: ["tannins", "ursolic acid"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Ledolo: può causare effetti narcotici/psicotropi a dosi molto alte", "Aroma resinoso-terroso che può dominare"],
		notes: "Foglie essiccate. Aroma resinoso, terroso, con note di agrumi. Usato tradizionalmente in birre nordiche e canadesi. Dosare con cautela per il contenuto di ledolo."
	},
	{
		id: "lavender",
		name: "Lavanda",
		aliases: [
			"lavanda",
			"lavender",
			"lavandula"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "whirlpool",
			contactTimeHours: .25,
			temperatureCelsius: 85
		},
		profile: {
			aroma: .85,
			pungency: 0,
			bitterness: .2,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"linalool",
			"linalyl acetate",
			"1,8-cineole",
			"camphor"
		],
		keyActives: ["linalool", "tannins"],
		perceptionProfile: "persistent",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 3],
		risks: [
			"CURVA RIPIDA: la distanza tra piacevole e saponoso/profumato è minima",
			"Può evocare sapone o profumo se sovradosata",
			"Aroma molto persistente"
		],
		notes: "Fiori essiccati. Usare varietà culinaria (L. angustifolia), non ornamentale. Infusione a caldo 10-15 min o dry-herb 24h. Ottimo in Saison, blonde ale e birre al miele."
	},
	{
		id: "lemon_balm",
		name: "Melissa",
		aliases: [
			"melissa",
			"lemon balm",
			"melissa officinalis",
			"cedronella"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "whirlpool",
			contactTimeHours: .25,
			temperatureCelsius: 85
		},
		profile: {
			aroma: .55,
			pungency: 0,
			bitterness: .15,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"citronellal",
			"geranial",
			"neral",
			"β-caryophyllene"
		],
		keyActives: ["citronellal", "rosmarinic acid"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma citrato delicato: facilmente mascherato da luppoli intensi", "I volatili citrati si degradano rapidamente con il calore"],
		notes: "Foglie essiccate. Aroma di limone dolce e menta. Infusione a caldo 10-15 min o dry-herb. Ottimo in witbier, Saison e birre estive."
	},
	{
		id: "licorice_root",
		name: "Liquirizia (radice)",
		aliases: [
			"liquirizia",
			"licorice",
			"licorice root",
			"glycyrrhiza glabra"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .4,
			pungency: 0,
			bitterness: .25,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: .7,
			max: 3,
			recommend: 1.8
		},
		medium: {
			min: 3,
			max: 7,
			recommend: 5
		},
		high: {
			min: 7,
			max: 14,
			recommend: 10
		},
		keyVolatiles: [
			"anethole",
			"estragole",
			"hexanoic acid"
		],
		keyActives: ["glycyrrhizin", "glycyrrhizic acid"],
		perceptionProfile: "building",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Glicirrizina: dolcezza persistente che si accumula",
			"Può aggiungere dolcezza non fermentabile",
			"Effetto lassativo a dosi molto alte"
		],
		notes: "Radice essiccata, spezzettata. Dolcezza naturale 50× superiore al saccarosio. La dolcezza persiste dopo fermentazione. Ottimo in stout, porter e birre scure."
	},
	{
		id: "milk_thistle",
		name: "Cardo mariano",
		aliases: [
			"cardo mariano",
			"milk thistle",
			"silybum marianum"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .75,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .2,
			pungency: 0,
			bitterness: .5,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: ["hexanal", "benzaldehyde"],
		keyActives: ["silymarin", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Amarezza erbacea marcata", "Silimarina: sapore terroso e amaro persistente"],
		notes: "Foglie essiccate. Amaro erbaceo e terroso. Usato storicamente in birre medicinali e come sostituto parziale del luppolo in alcune tradizioni."
	},
	{
		id: "mugwort",
		name: "Artemisia comune",
		aliases: [
			"artemisia",
			"mugwort",
			"artemisia vulgaris",
			"erba di san giovanni"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .4,
			pungency: 0,
			bitterness: .45,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"thujone",
			"1,8-cineole",
			"camphor",
			"β-caryophyllene"
		],
		keyActives: ["thujone", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Thujone: usare con moderazione (tossico ad alte dosi)",
			"Amarezza erbacea intensa",
			"Può dominare birre delicate"
		],
		notes: "Foglie essiccate. Aroma erbaceo-balsamico con note di salvia. Usata storicamente in birre prima del luppolo (gruit). Non superare i dosaggi consigliati."
	},
	{
		id: "nettle",
		name: "Ortica",
		aliases: [
			"ortica",
			"nettle",
			"urtica dioica",
			"ortica fresca"
		],
		category: "herb",
		referenceForm: "fresh",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .25,
			pungency: 0,
			bitterness: .35,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"hexanal",
			"3-hexenol",
			"phenylacetaldehyde"
		],
		keyActives: [
			"chlorophyll",
			"tannins",
			"minerals"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Foglie fresche: contenuto d'acqua variabile (~80-85%)",
			"Sapore vegetale/erbaceo che può dominare",
			"Raccogliere solo prima della fioritura (giovani)"
		],
		notes: "Foglie fresche, raccolte prima della fioritura. Sapore vegetale, minerale, leggermente amaro. Tradizionalmente usata in birre primaverili inglesi. Se essiccata: ~1/5 del peso fresco."
	},
	{
		id: "rose_hips",
		name: "Bacche di rosa canina",
		aliases: [
			"rosa canina",
			"rose hips",
			"cinorrodonti",
			"rosehip"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .35,
			pungency: 0,
			bitterness: .2,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"β-damascenone",
			"geraniol",
			"citronellol",
			"phenylethyl alcohol"
		],
		keyActives: [
			"ascorbic acid",
			"tannins",
			"pectin"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Astringenza da tannini e pectina",
			"Colore rosso-arancio che può influenzare l'aspetto",
			"Sapore fruttato-acidulo che può sembrare acidità"
		],
		notes: "Bacche essiccate e spezzettate. Aroma fruttato-floreale con note di mela e fragola. Ricche di vitamina C. Ottimo in Saison, sour e birre alla frutta."
	},
	{
		id: "rosemary",
		name: "Rosmarino",
		aliases: [
			"rosmarino",
			"rosemary",
			"rosmarinus officinalis"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .75,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .65,
			pungency: .1,
			bitterness: .3,
			astringency: .25,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: [
			"1,8-cineole",
			"α-pinene",
			"camphor",
			"borneol",
			"verbenone"
		],
		keyActives: ["rosmarinic acid", "carnosic acid"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		oilRangePercent: [.5, 2.5],
		risks: [
			"Aroma resinoso-balsamico molto potente: CURVA RIPIDA",
			"Può evocare note da cucina se sovradosato",
			"L'1,8-cineolo è dominante e persistente"
		],
		notes: "Foglie essiccate. Aroma balsamico, pino, canfora. Ottimo in Saison, Farmhouse e birre al miele. Dosare con cautela: iniziare dal minimo."
	},
	{
		id: "sarsaparilla",
		name: "Salsapariglia",
		aliases: [
			"salsapariglia",
			"sarsaparilla",
			"smilax"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .35,
			pungency: 0,
			bitterness: .25,
			astringency: .2,
			cooling: 0
		},
		low: {
			min: .7,
			max: 3,
			recommend: 1.8
		},
		medium: {
			min: 3,
			max: 7,
			recommend: 5
		},
		high: {
			min: 7,
			max: 14,
			recommend: 10
		},
		keyVolatiles: [
			"methyl salicylate",
			"safrole",
			"vanillin"
		],
		keyActives: ["saponins", "tannins"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Safrolo: potenzialmente cancerogeno ad alte dosi (regolamentato in alcuni paesi)", "Sapore dolce-radice che può dominare"],
		notes: "Radice essiccata. Sapore dolce, radice, con note di wintergreen e vaniglia. Ingrediente classico della root beer tradizionale. Ottimo in stout e porter."
	},
	{
		id: "spruce_tips",
		name: "Abete (germogli freschi)",
		aliases: [
			"abete",
			"spruce tips",
			"germogli di abete",
			"spruce buds"
		],
		category: "herb",
		referenceForm: "fresh",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: 1,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .55,
			pungency: .1,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 9,
			max: 36,
			recommend: 22
		},
		medium: {
			min: 36,
			max: 85,
			recommend: 60
		},
		high: {
			min: 85,
			max: 170,
			recommend: 120
		},
		keyVolatiles: [
			"α-pinene",
			"β-pinene",
			"limonene",
			"bornyl acetate",
			"δ-3-carene"
		],
		keyActives: ["tannins", "vitamin C"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Resinoso e astringente: può dominare birre delicate",
			"Raccogliere solo germogli primaverili teneri (non aghi maturi)",
			"Variabilità stagionale significativa"
		],
		notes: "Germogli freschi primaverili, di colore verde chiaro. Aroma resinoso, agrumato, balsamico. Tradizionalmente usato in birre nordiche e coloniali americane. Ottimo in Saison, Farmhouse e porter."
	},
	{
		id: "sweet_basil",
		name: "Basilico dolce",
		aliases: [
			"basilico",
			"sweet basil",
			"basilico genovese",
			"ocimum basilicum"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "whirlpool",
			contactTimeHours: .25,
			temperatureCelsius: 85
		},
		profile: {
			aroma: .55,
			pungency: 0,
			bitterness: .15,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"linalool",
			"estragole",
			"eugenol",
			"1,8-cineole"
		],
		keyActives: ["linalool", "rosmarinic acid"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Aroma che può evocare cucina/pesto se sovradosato", "I volatili delicati si perdono rapidamente con il calore"],
		notes: "Foglie essiccate. Aroma dolce, leggermente anicato e floreale. Infusione a caldo 10-15 min o dry-herb. Ottimo in Saison, witbier e birre estive."
	},
	{
		id: "sweet_gale",
		name: "Mirto di palude / Sweet Gale",
		aliases: [
			"mirto di palude",
			"sweet gale",
			"bog myrtle",
			"myrica gale"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .5,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .5,
			pungency: .05,
			bitterness: .3,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"α-pinene",
			"limonene",
			"myrcene",
			"β-caryophyllene"
		],
		keyActives: ["tannins", "myricitrin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Astringenza significativa", "Resinoso: può sovrapporsi con luppoli resinosi"],
		notes: "Foglie essiccate. Aroma resinoso, balsamico, leggermente agrumato. Ingrediente tradizionale del gruit scandinavo e scozzese. Ottimo in Saison e Farmhouse ale."
	},
	{
		id: "sweet_woodruff",
		name: "Asperula / Stellina odorosa",
		aliases: [
			"asperula",
			"stellina odorosa",
			"sweet woodruff",
			"galium odoratum",
			"waldmeister"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 48,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .55,
			pungency: 0,
			bitterness: .1,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 1.5,
			max: 6,
			recommend: 3.5
		},
		medium: {
			min: 6,
			max: 14,
			recommend: 10
		},
		high: {
			min: 14,
			max: 28,
			recommend: 20
		},
		keyVolatiles: ["coumarin", "salicylaldehyde"],
		keyActives: ["coumarin", "asperuloside"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Cumarina: epatotossica ad alte dosi. Non superare i dosaggi consigliati.", "Aroma molto persistente"],
		notes: "Foglie essiccate. Aroma di fieno dolce, vaniglia e mandorla (cumarina). L'aroma si sviluppa durante l'essiccazione. Classica nella Berliner Weisse e nelle birre tedesche. Infusione a freddo 24-48h."
	},
	{
		id: "sweetgrass",
		name: "Erba dolce / Sweetgrass",
		aliases: [
			"erba dolce",
			"sweetgrass",
			"hierochloe odorata",
			"erba della madonna"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "conditioning",
			contactTimeHours: 48,
			temperatureCelsius: 20
		},
		profile: {
			aroma: .5,
			pungency: 0,
			bitterness: .1,
			astringency: .15,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"coumarin",
			"vanillin",
			"benzaldehyde"
		],
		keyActives: ["coumarin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Cumarina: epatotossica ad alte dosi", "Aroma delicato: facilmente mascherato"],
		notes: "Foglie essiccate. Aroma di fieno dolce, vaniglia e mandorla. Usata tradizionalmente in birre nord-europee e polacche. Infusione a freddo 24-48h."
	},
	{
		id: "wintergreen",
		name: "Wintergreen / Gaultheria",
		aliases: [
			"wintergreen",
			"gaultheria",
			"gaultheria procumbens"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "whirlpool",
			contactTimeHours: .5,
			temperatureCelsius: 85
		},
		profile: {
			aroma: .6,
			pungency: 0,
			bitterness: .2,
			astringency: .25,
			cooling: .3
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"methyl salicylate",
			"limonene",
			"α-pinene"
		],
		keyActives: ["methyl salicylate", "gaultherin"],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"Metil salicilato: aroma molto potente e persistente (simile a pomata/linimento)",
			"Può evocare note medicinali/farmaceutiche se sovradosato",
			"Tossico ad alte dosi: non superare i dosaggi"
		],
		notes: "Foglie essiccate. Aroma intenso di menta invernale, balsamico, con sensazione rinfrescante. Usato tradizionalmente in root beer e birre speziate. Dosare con estrema cautela."
	},
	{
		id: "wormwood",
		name: "Assenzio / Artemisia absinthium",
		aliases: [
			"assenzio",
			"wormwood",
			"artemisia absinthium",
			"assenzio maggiore"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .25,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .45,
			pungency: 0,
			bitterness: .8,
			astringency: .35,
			cooling: 0
		},
		low: {
			min: .25,
			max: 1,
			recommend: .6
		},
		medium: {
			min: 1,
			max: 2.5,
			recommend: 1.8
		},
		high: {
			min: 2.5,
			max: 5,
			recommend: 3.5
		},
		keyVolatiles: [
			"thujone",
			"absinthin",
			"artabsin",
			"chamazulene"
		],
		keyActives: [
			"absinthin",
			"thujone",
			"artabsin"
		],
		perceptionProfile: "persistent",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: [
			"ESTREMAMENTE AMARO: absintina è uno dei composti più amari conosciuti",
			"Thujone: neurotossico ad alte dosi. Non superare MAI i dosaggi.",
			"CURVA RIPIDA: pochi decimi di grammo fanno la differenza"
		],
		notes: "Foglie essiccate. Amarezza estrema e persistente. Usato storicamente nel gruit e in birre medicinali. DOSARE CON ESTREMA CAUTELA: iniziare sempre dal minimo assoluto."
	},
	{
		id: "yarrow",
		name: "Achillea millefoglie",
		aliases: [
			"achillea",
			"yarrow",
			"achillea millefolium",
			"millefoglie"
		],
		category: "herb",
		referenceForm: "dried",
		referenceConditions: {
			stage: "boil",
			contactTimeHours: .5,
			temperatureCelsius: 100
		},
		profile: {
			aroma: .4,
			pungency: 0,
			bitterness: .4,
			astringency: .3,
			cooling: 0
		},
		low: {
			min: 3,
			max: 12,
			recommend: 7
		},
		medium: {
			min: 12,
			max: 28,
			recommend: 20
		},
		high: {
			min: 28,
			max: 56,
			recommend: 40
		},
		keyVolatiles: [
			"chamazulene",
			"β-pinene",
			"1,8-cineole",
			"sabinene"
		],
		keyActives: [
			"achilleine",
			"tannins",
			"azulene"
		],
		perceptionProfile: "immediate",
		doseUnit: "g",
		extraction: {
			volatileRateMultiplier: 1,
			nonVolatileRateMultiplier: 1
		},
		risks: ["Amarezza erbacea moderata", "Azulene: colore blu-verde che può influenzare l'aspetto"],
		notes: "Foglie e fiori essiccati. Aroma erbaceo, leggermente balsamico e amaro. Usata storicamente nel gruit e in birre medicinali anglosassoni. Ottimo in Saison e Farmhouse ale."
	}
];
/** Lookup key: two spice IDs sorted alphabetically. */
function interactKey(a, b) {
	return [a, b].sort().join("::");
}
const INTERACTIONS = {
	"black_pepper::coriander_seed": {
		ingredientA: "black_pepper",
		ingredientB: "coriander_seed",
		aromaCompatibility: .6,
		pungencySynergy: .2,
		bitternessRisk: .3,
		astringencyRisk: .25,
		explanation: "Buona complementarità: coriandolo agrumato/floreale completa il pepe resinoso. Terpeni condivisi (pineni, limonene)."
	},
	"black_pepper::sichuan_pepper": {
		ingredientA: "black_pepper",
		ingredientB: "sichuan_pepper",
		aromaCompatibility: .4,
		pungencySynergy: .7,
		bitternessRisk: .3,
		astringencyRisk: .6,
		explanation: "Alta sinergia pungente con effetto buzz amplificato. Rischio di sovraccarico trigeminale. Ridurre entrambi del 30%."
	},
	"black_pepper::chili": {
		ingredientA: "black_pepper",
		ingredientB: "chili",
		aromaCompatibility: .2,
		pungencySynergy: .8,
		bitternessRisk: .25,
		astringencyRisk: .5,
		explanation: "Pungenza cumulativa. Due fonti di calore si sommano in modo non lineare. Ridurre entrambi del 40% rispetto al dosaggio singolo."
	},
	"black_pepper::ginger": {
		ingredientA: "black_pepper",
		ingredientB: "ginger",
		aromaCompatibility: .4,
		pungencySynergy: .6,
		bitternessRisk: .2,
		astringencyRisk: .35,
		explanation: "Buona complementarità aromatica (terpeni condivisi) ma pungenza cumulativa. Ridurre ciascuno del 25%."
	},
	"black_pepper::cinnamon": {
		ingredientA: "black_pepper",
		ingredientB: "cinnamon",
		aromaCompatibility: .5,
		pungencySynergy: .3,
		bitternessRisk: .4,
		astringencyRisk: .45,
		explanation: "Classico abbinamento invernale. Il calore della cannella completa il pepe. Attenzione all'astringenza cumulativa."
	},
	"black_pepper::clove": {
		ingredientA: "black_pepper",
		ingredientB: "clove",
		aromaCompatibility: .2,
		pungencySynergy: .4,
		bitternessRisk: .6,
		astringencyRisk: .7,
		explanation: "Rischio alto. Eugenolo + astringenza del pepe creano sensazione tannica aggressiva."
	},
	"coriander_seed::orange_peel": {
		ingredientA: "coriander_seed",
		ingredientB: "orange_peel",
		aromaCompatibility: .7,
		pungencySynergy: 0,
		bitternessRisk: .4,
		astringencyRisk: .2,
		explanation: "Alta affinità agrumata/floreale (linalolo + limonene). Rischio profilo saponoso/detergente se entrambi a dose alta."
	},
	"coriander_seed::lemon_peel": {
		ingredientA: "coriander_seed",
		ingredientB: "lemon_peel",
		aromaCompatibility: .65,
		pungencySynergy: 0,
		bitternessRisk: .3,
		astringencyRisk: .15,
		explanation: "Simile all'arancia ma profilo più fresco e meno saponoso. Buona sinergia."
	},
	"cinnamon::clove": {
		ingredientA: "cinnamon",
		ingredientB: "clove",
		aromaCompatibility: .5,
		pungencySynergy: .35,
		bitternessRisk: .6,
		astringencyRisk: .75,
		explanation: "Entrambi ricchi di eugenolo: ridondanza e astringenza cumulativa. Meglio sceglierne uno solo come dominante."
	},
	"cinnamon::vanilla": {
		ingredientA: "cinnamon",
		ingredientB: "vanilla",
		aromaCompatibility: .7,
		pungencySynergy: 0,
		bitternessRisk: .1,
		astringencyRisk: .2,
		explanation: "Classico dessert. La vaniglia ammorbidisce il calore della cannella. Ottima sinergia."
	},
	"cinnamon::nutmeg": {
		ingredientA: "cinnamon",
		ingredientB: "nutmeg",
		aromaCompatibility: .6,
		pungencySynergy: .25,
		bitternessRisk: .4,
		astringencyRisk: .45,
		explanation: "Buona compatibilità invernale. Entrambi caldi e speziati ma con profili complementari."
	},
	"clove::star_anise": {
		ingredientA: "clove",
		ingredientB: "star_anise",
		aromaCompatibility: .3,
		pungencySynergy: .3,
		bitternessRisk: .6,
		astringencyRisk: .7,
		explanation: "Entrambi dominanti con curva ripida. Rischio molto alto di saturazione sensoriale. Meglio sceglierne uno."
	},
	"chili::ginger": {
		ingredientA: "chili",
		ingredientB: "ginger",
		aromaCompatibility: .3,
		pungencySynergy: .75,
		bitternessRisk: .2,
		astringencyRisk: .35,
		explanation: "Tre fonti di calore trigeminale (capsaicina + gingerolo). Rischio di aggressività: procedere con estrema cautela."
	},
	"chili::sichuan_pepper": {
		ingredientA: "chili",
		ingredientB: "sichuan_pepper",
		aromaCompatibility: .25,
		pungencySynergy: .65,
		bitternessRisk: .2,
		astringencyRisk: .5,
		explanation: "Fuoco + formicolio: effetto amplificato. Interessante ma pericoloso a dosi alte."
	},
	"cardamom::orange_peel": {
		ingredientA: "cardamom",
		ingredientB: "orange_peel",
		aromaCompatibility: .55,
		pungencySynergy: 0,
		bitternessRisk: .25,
		astringencyRisk: .2,
		explanation: "L'1,8-cineolo del cardamomo completa gli agrumi. Buona sinergia floreale-agrumata."
	},
	"cardamom::cinnamon": {
		ingredientA: "cardamom",
		ingredientB: "cinnamon",
		aromaCompatibility: .5,
		pungencySynergy: .2,
		bitternessRisk: .35,
		astringencyRisk: .3,
		explanation: "Classico mediorientale. Il cardamomo aggiunge freschezza alla cannella calda."
	},
	"vanilla::nutmeg": {
		ingredientA: "vanilla",
		ingredientB: "nutmeg",
		aromaCompatibility: .65,
		pungencySynergy: 0,
		bitternessRisk: .1,
		astringencyRisk: .15,
		explanation: "La dolcezza della vaniglia bilancia la speziatura della noce moscata. Ottima compatibilità."
	},
	"vanilla::cinnamon": {
		ingredientA: "vanilla",
		ingredientB: "cinnamon",
		aromaCompatibility: .7,
		pungencySynergy: 0,
		bitternessRisk: .1,
		astringencyRisk: .2,
		explanation: "Vedi cinnamon::vanilla (simmetrico)."
	},
	"vanilla::clove": {
		ingredientA: "vanilla",
		ingredientB: "clove",
		aromaCompatibility: .45,
		pungencySynergy: .1,
		bitternessRisk: .35,
		astringencyRisk: .4,
		explanation: "La vaniglia può ammorbidire il chiodo ma non eliminare l'astringenza. Usare chiodo come nota di sfondo."
	},
	"ginger::cinnamon": {
		ingredientA: "ginger",
		ingredientB: "cinnamon",
		aromaCompatibility: .55,
		pungencySynergy: .4,
		bitternessRisk: .25,
		astringencyRisk: .3,
		explanation: "Caldo + caldo: buona compatibilità invernale. Attenzione alla pungenza cumulativa."
	},
	"ginger::lemon_peel": {
		ingredientA: "ginger",
		ingredientB: "lemon_peel",
		aromaCompatibility: .6,
		pungencySynergy: .15,
		bitternessRisk: .15,
		astringencyRisk: .2,
		explanation: "Lo zenzero citrato con limone è un classico rinfrescante. Ottimo in Saison e Witbier."
	},
	"allspice::cinnamon": {
		ingredientA: "allspice",
		ingredientB: "cinnamon",
		aromaCompatibility: .55,
		pungencySynergy: .3,
		bitternessRisk: .35,
		astringencyRisk: .4,
		explanation: "Ridondanza parziale (il pimento sa già di cannella). Se li usi entrambi, riduci ciascuno del 40%."
	},
	"allspice::clove": {
		ingredientA: "allspice",
		ingredientB: "clove",
		aromaCompatibility: .4,
		pungencySynergy: .3,
		bitternessRisk: .55,
		astringencyRisk: .65,
		explanation: "Alta ridondanza (eugenolo in entrambi). Meglio sceglierne uno solo."
	},
	"juniper::coriander_seed": {
		ingredientA: "juniper",
		ingredientB: "coriander_seed",
		aromaCompatibility: .5,
		pungencySynergy: .15,
		bitternessRisk: .35,
		astringencyRisk: .35,
		explanation: "Terpeni condivisi (pineni). Buona compatibilità resinosa-agrumata. Ottimo in Saison e Farmhouse."
	},
	"juniper::black_pepper": {
		ingredientA: "juniper",
		ingredientB: "black_pepper",
		aromaCompatibility: .45,
		pungencySynergy: .4,
		bitternessRisk: .4,
		astringencyRisk: .5,
		explanation: "Resinoso + resinoso: può diventare monotematico. Meglio con una terza spezia agrumata."
	},
	"long_pepper::cinnamon": {
		ingredientA: "long_pepper",
		ingredientB: "cinnamon",
		aromaCompatibility: .45,
		pungencySynergy: .5,
		bitternessRisk: .4,
		astringencyRisk: .45,
		explanation: "Calore complesso e persistente. Ottimo in stout invernali ma con cautela."
	}
};
function findInteraction(a, b) {
	return INTERACTIONS[interactKey(a, b)];
}
function normalizeName(value) {
	return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}
function findAllSpiceMatches(raw) {
	const query = normalizeName(raw);
	const exact = SPICES.filter((s) => s.id === query || normalizeName(s.name) === query || s.aliases.some((a) => normalizeName(a) === query));
	if (exact.length > 0) return exact;
	return SPICES.filter((s) => normalizeName(s.name).includes(query) || s.aliases.some((a) => normalizeName(a).includes(query))).sort((a, b) => Math.abs(a.name.length - raw.length) - Math.abs(b.name.length - raw.length));
}
function findSpice(raw) {
	const matches = findAllSpiceMatches(raw);
	if (matches.length === 0) return void 0;
	return matches[0];
}
function computeSpiceDose(input) {
	const matches = findAllSpiceMatches(input.spice_name);
	if (matches.length === 0) throw new Error(`Ingrediente "${input.spice_name}" non trovato nel database.`);
	const spice = matches[0];
	const isChili = spice.id === "chili";
	const refRange = spice[input.intensity];
	if (isChili && !input.capsaicinoids_mg_per_g && !input.shu) return buildChiliUnknownResult(spice, input);
	const isDirectLiquid = spice.deliveryMode === "direct_liquid_dose";
	const form = FORMS[input.form];
	const refForm = FORMS[spice.referenceForm];
	const relativeVolatileExtract = isDirectLiquid ? 1 : form.volatileExtractSpeed / Math.max(.01, refForm.volatileExtractSpeed);
	const relativeNonVolatileExtract = isDirectLiquid ? 1 : form.nonVolatileExtractSpeed / Math.max(.01, refForm.nonVolatileExtractSpeed);
	const stage = STAGES[input.stage];
	const timeHours = clamp(input.contact_time_hours, .05, 720);
	const tempC = Math.max(0, input.temperature_celsius);
	const tempKMultiplier = Math.pow(1.8, (tempC - 20) / 10);
	const kVolatile = .03 * tempKMultiplier * spice.extraction.volatileRateMultiplier;
	const kNonVolatile = .02 * tempKMultiplier * spice.extraction.nonVolatileRateMultiplier;
	const volatileExtractFraction = isDirectLiquid ? 1 : 1 - Math.exp(-kVolatile * timeHours);
	const nonVolatileExtractFraction = isDirectLiquid ? 1 : 1 - Math.exp(-kNonVolatile * timeHours);
	const effectiveHeatLoss = stage.volatileEvaporation * form.volatileHeatLoss;
	const volatileRetention = effectiveHeatLoss < 1 ? Math.exp(-effectiveHeatLoss * 3 * volatileExtractFraction) : .05;
	const effectiveVolatileExtract = isDirectLiquid ? 1 : volatileExtractFraction * volatileRetention * stage.volatileExtract;
	const effectiveNonVolatileExtract = isDirectLiquid ? 1 : nonVolatileExtractFraction * stage.nonVolatileExtract;
	const refConditions = spice.referenceConditions ?? {
		stage: "conditioning",
		contactTimeHours: 72,
		temperatureCelsius: 20
	};
	const refStage = STAGES[refConditions.stage];
	const refTimeHours = refConditions.contactTimeHours;
	const refTempMultiplier = Math.pow(1.8, (refConditions.temperatureCelsius - 20) / 10);
	const refKVolatile = .03 * refTempMultiplier * spice.extraction.volatileRateMultiplier;
	const refKNonVolatile = .02 * refTempMultiplier * spice.extraction.nonVolatileRateMultiplier;
	const refVolatileFraction = isDirectLiquid ? 1 : 1 - Math.exp(-refKVolatile * refTimeHours);
	const refNonVolatileFraction = isDirectLiquid ? 1 : 1 - Math.exp(-refKNonVolatile * refTimeHours);
	const refEffectiveHeatLoss = refStage.volatileEvaporation * refForm.volatileHeatLoss;
	const refVolatileRetention = Math.exp(-refEffectiveHeatLoss * 3 * refVolatileFraction);
	const refEffectiveVolatile = isDirectLiquid ? 1 : refVolatileFraction * refVolatileRetention * refStage.volatileExtract;
	const refEffectiveNonVolatile = isDirectLiquid ? 1 : refNonVolatileFraction * refStage.nonVolatileExtract;
	const baseVolatileDoseDivisor = effectiveVolatileExtract / Math.max(.01, refEffectiveVolatile) * relativeVolatileExtract;
	const baseNonVolatileDoseDivisor = effectiveNonVolatileExtract / Math.max(.01, refEffectiveNonVolatile) * relativeNonVolatileExtract;
	const potencyFactor = isDirectLiquid ? 1 : potencyMultiplier(input.freshness);
	const matrix = computeMatrixFactors(input.beer_matrix);
	const extractionBoost = isDirectLiquid ? 1 : matrix.extractionFactor;
	const aromaMasking = matrix.maskingFactor.aroma;
	const aromaAmplification = matrix.perceptionAmplification.aroma;
	let roastAromaPotency = 1;
	let roastBitterness = 1;
	let roastAstringency = 1;
	if (input.roast_level && (spice.category === "coffee" || spice.category === "cocoa")) {
		const ra = input.roast_level === "light" ? {
			aromaPotency: 1.05,
			bitterness: .85,
			astringency: .95
		} : input.roast_level === "dark" ? {
			aromaPotency: .9,
			bitterness: 1.2,
			astringency: 1.1
		} : {
			aromaPotency: 1,
			bitterness: 1,
			astringency: 1
		};
		roastAromaPotency = ra.aromaPotency;
		roastBitterness = ra.bitterness;
		roastAstringency = ra.astringency;
	}
	let woodToastAroma = 1;
	let woodToastAstringency = 1;
	if (input.wood_toast_level && spice.category === "wood") {
		const wt = WOOD_TOAST[input.wood_toast_level];
		woodToastAroma = wt.aroma;
		woodToastAstringency = wt.astringency;
	}
	const nonVolatileWeightRaw = spice.profile.pungency + spice.profile.bitterness * .7 + spice.profile.astringency * .8;
	const totalWeight = spice.profile.aroma + nonVolatileWeightRaw + .01;
	const aromaWeight = spice.profile.aroma / totalWeight;
	const nonVolatileWeight = nonVolatileWeightRaw / totalWeight;
	const aromaDoseDivisor = baseVolatileDoseDivisor * potencyFactor * extractionBoost * aromaAmplification * Math.max(.4, aromaMasking) * roastAromaPotency * woodToastAroma;
	const nonVolatileProfileTotal = spice.profile.pungency + spice.profile.bitterness + spice.profile.astringency + .01;
	const nonVolatileAmplification = (spice.profile.pungency * matrix.perceptionAmplification.pungency + spice.profile.bitterness * matrix.perceptionAmplification.bitterness + spice.profile.astringency * matrix.perceptionAmplification.astringency) / nonVolatileProfileTotal;
	const roastNonVolatileWeightTotal = spice.profile.bitterness + spice.profile.astringency + .01;
	const nonVolatileRoastPenalty = (spice.profile.bitterness * roastBitterness + spice.profile.astringency * roastAstringency) / roastNonVolatileWeightTotal;
	const nonVolatileDoseDivisor = baseNonVolatileDoseDivisor * potencyFactor * extractionBoost * nonVolatileAmplification * nonVolatileRoastPenalty * woodToastAstringency;
	const blendedDoseDivisor = aromaDoseDivisor * aromaWeight + nonVolatileDoseDivisor * nonVolatileWeight;
	const safeAromaDivisor = Math.max(.15, aromaDoseDivisor);
	const safeNonVolatileDivisor = Math.max(.15, nonVolatileDoseDivisor);
	const aromaTargetDose = refRange.recommend * (input.batch_liters / 20) / safeAromaDivisor;
	const nonVolatileTargetDose = refRange.recommend * (input.batch_liters / 20) / safeNonVolatileDivisor;
	const doseDivergence = Math.max(aromaTargetDose, nonVolatileTargetDose) / Math.max(.01, Math.min(aromaTargetDose, nonVolatileTargetDose));
	const CHILI_REFERENCE_SHU = 4e4;
	let refMin = refRange.min;
	let refMax = refRange.max;
	let refRec = refRange.recommend;
	if (isChili) {
		const chiliIntensityFactor = {
			low: .4,
			medium: 1,
			high: 1.8
		}[input.intensity];
		if (input.shu) {
			refRec = 1 * (CHILI_REFERENCE_SHU / Math.max(100, input.shu)) * chiliIntensityFactor;
			refMin = refRec * .6;
			refMax = refRec * 1.8;
		} else if (input.capsaicinoids_mg_per_g) {
			const approxShu = input.capsaicinoids_mg_per_g * 15e3;
			refRec = 1 * (CHILI_REFERENCE_SHU / Math.max(1500, approxShu)) * chiliIntensityFactor;
			refMin = refRec * .6;
			refMax = refRec * 1.8;
		}
	}
	const batchScale = input.batch_liters / 20;
	const divisorWasClamped = blendedDoseDivisor < .15;
	const safeDivisor = Math.max(.15, blendedDoseDivisor);
	const COFFEE_REFERENCE_GRAMSPERLITER = 200;
	const liquidStrengthFactor = (() => {
		if (input.coffee_grams_per_liter && input.coffee_grams_per_liter > 0) return input.coffee_grams_per_liter / COFFEE_REFERENCE_GRAMSPERLITER;
		if (input.liquid_strength_relative !== void 0 && input.liquid_strength_relative > 0) return input.liquid_strength_relative;
		return 1;
	})();
	const doseRecommended = refRec * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
	const doseMin = refMin * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
	const doseMax = refMax * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
	const dilutionPercent = (spice.doseUnit === "ml" ? doseRecommended / 1e3 : 0) / input.batch_liters * 100;
	const deliveredStrengthFactor = isDirectLiquid ? liquidStrengthFactor : 1;
	const effectiveVolatileDoseGL = doseRecommended * deliveredStrengthFactor * effectiveVolatileExtract * relativeVolatileExtract * potencyFactor * extractionBoost / input.batch_liters;
	const effectiveNonVolatileDoseGL = doseRecommended * deliveredStrengthFactor * effectiveNonVolatileExtract * relativeNonVolatileExtract * potencyFactor * extractionBoost / input.batch_liters;
	const calibrationMediumDoseG = isChili ? (() => {
		const capsaicinoidShu = (input.capsaicinoids_mg_per_g ?? 0) * 15e3;
		const effectiveShu = input.shu ?? (capsaicinoidShu > 0 ? capsaicinoidShu : 4e4);
		return 1 * CHILI_REFERENCE_SHU / Math.max(100, effectiveShu);
	})() : spice.medium.recommend;
	const refMediumDoseGL = Math.max(.001, calibrationMediumDoseG / 20);
	const refEffectiveVolatileGL = refMediumDoseGL * refEffectiveVolatile;
	const refEffectiveNonVolatileGL = refMediumDoseGL * refEffectiveNonVolatile;
	const halfSatVolatileGL = Math.max(.001, refEffectiveVolatileGL);
	const halfSatNonVolatileGL = Math.max(.001, refEffectiveNonVolatileGL);
	const hillNAroma = spice.perceptionProfile === "persistent" ? 2 : 1;
	const hillNNonVolatile = spice.perceptionProfile === "building" ? 2 : 1;
	const rawAroma = Math.pow(effectiveVolatileDoseGL, hillNAroma) / (Math.pow(halfSatVolatileGL, hillNAroma) + Math.pow(effectiveVolatileDoseGL, hillNAroma));
	const rawNonVolatile = Math.pow(effectiveNonVolatileDoseGL, hillNNonVolatile) / (Math.pow(halfSatNonVolatileGL, hillNNonVolatile) + Math.pow(effectiveNonVolatileDoseGL, hillNNonVolatile));
	const dominantProfile = Math.max(spice.profile.aroma, spice.profile.pungency, spice.profile.bitterness, spice.profile.astringency, spice.profile.cooling, .01);
	const normAroma = spice.profile.aroma / dominantProfile;
	const normNonVolatile = spice.profile.pungency / dominantProfile;
	const normBitterness = spice.profile.bitterness / dominantProfile;
	const normAstringency = spice.profile.astringency / dominantProfile;
	const normCooling = spice.profile.cooling / dominantProfile;
	const contributions = {
		aroma: clamp01(rawAroma * normAroma * aromaAmplification * aromaMasking * roastAromaPotency * woodToastAroma),
		pungency: clamp01(rawNonVolatile * normNonVolatile * matrix.perceptionAmplification.pungency),
		bitterness: clamp01(rawNonVolatile * normBitterness * matrix.perceptionAmplification.bitterness * roastBitterness),
		astringency: clamp01(rawNonVolatile * normAstringency * matrix.perceptionAmplification.astringency * roastAstringency * woodToastAstringency),
		cooling: clamp01(rawAroma * normCooling * matrix.perceptionAmplification.cooling)
	};
	let confidence = .8;
	const confidenceNotes = [];
	if (isChili) {
		if (input.shu) {
			confidence -= .1;
			confidenceNotes.push("Variabilità SHU: il valore nominale può differire dal lotto reale fino al 30%.");
		}
		if (input.capsaicinoids_mg_per_g) confidence -= .05;
		if (!input.shu && !input.capsaicinoids_mg_per_g) {
			confidence = .3;
			confidenceNotes.push("Nessun SHU o capsaicinoidi dichiarati: intervallo ampio e incerto.");
		}
	}
	if (spice.id === "coffee_ground" && input.intensity === "high") {
		confidence -= .15;
		confidenceNotes.push("Caffè macinato a intensità alta: rischio elevato di sovra-estrazione. Bench trial obbligatorio prima di scalare.");
	}
	if (input.form === "ground") {
		confidence -= .05;
		confidenceNotes.push("Forma macinata: estrazione rapida ma difficile da rimuovere e dosare con precisione.");
	}
	if (input.form === "fresh") {
		confidence -= .1;
		confidenceNotes.push("Fresco: contenuto d'acqua e potenza variabili con cultivar e stagione.");
	}
	if (input.freshness === "unknown") {
		confidence -= .1;
		confidenceNotes.push("Freschezza / condizione di conservazione sconosciuta: il profilo aromatico potrebbe essere degradato.");
	}
	if (input.freshness === "older") {
		confidence -= .15;
		confidenceNotes.push("Ingrediente conservato a lungo: possibile perdita di aromaticità o alterazione del profilo.");
	}
	if (spice.id === "cold_brew_coffee" && !input.coffee_grams_per_liter && !input.liquid_strength_relative) {
		confidence -= .15;
		confidenceNotes.push("Concentrazione del cold brew non dichiarata: la stima assume circa 200 g di caffè per litro d'acqua (rapporto 1:5).");
	}
	if (spice.id === "cold_brew_coffee" && input.prepared_hours_ago !== void 0 && input.prepared_hours_ago > 48) {
		confidence -= .1;
		confidenceNotes.push(`Cold brew preparato da ${input.prepared_hours_ago} ore: possibile ossidazione e perdita di volatili delicati.`);
	}
	if (input.contact_time_hours > 168) {
		confidence -= .05;
		confidenceNotes.push("Contatto prolungato (>7gg): possibile estrazione di tannini e note legnose.");
	}
	if (input.temperature_celsius > 80 && input.stage !== "boil") {
		confidence -= .05;
		confidenceNotes.push("Temperatura >80°C: possibile degradazione termica di alcuni volatili.");
	}
	const oilRange = spice.oilRangePercent;
	if (oilRange && oilRange[0] > 0 && oilRange[1] > 0 && oilRange[1] / oilRange[0] > 3) {
		confidence -= .1;
		confidenceNotes.push(`Forte variabilità dell'olio essenziale (${oilRange[0].toFixed(1)}-${oilRange[1].toFixed(1)}%): due lotti possono differire significativamente.`);
	}
	if (divisorWasClamped) {
		confidence -= .2;
		confidenceNotes.push("Efficienza prevista estremamente bassa: il correttore di sicurezza ha limitato la dose. Cambiare metodo di aggiunta (es. conditioning, tintura) invece di aumentare ulteriormente la quantità.");
	}
	if (doseDivergence > 2) {
		confidence -= .1;
		confidenceNotes.push("Aroma e sensazioni non volatili richiedono dosi molto diverse (fattore " + doseDivergence.toFixed(1) + "×). La dose proposta è un compromesso: preferire tintura e dosaggio incrementale.");
	}
	confidence = clamp(confidence, .1, .95);
	const practicallyRemovable = stage.removable && form.removable;
	const recommendedMethod = isDirectLiquid ? "Aggiungere il concentrato direttamente alla birra finita, preferibilmente nel keg o nel vessel di confezionamento. Mescolare delicatamente, attendere 10–15 minuti e assaggiare prima di aggiungerne altro." : input.stage === "tincture" ? "Tintura: aggiungere goccia a goccia su campione da 100 mL fino a intensità desiderata, poi scalare al volume totale." : practicallyRemovable ? `${stage.label} (${form.label}): aggiungere in sacchetto/sacco per rimozione facile. Assaggiare ogni 12-24 ore. Rimuovere quando l'intensità raggiunge ~80% del target (continuerà a estrarre brevemente dopo la rimozione).` : `${stage.label} (${form.label}): metodo non rimovibile. Iniziare con il 70% della dose consigliata, assaggiare dopo 24 ore, aggiungere il resto se necessario.`;
	const sampleDose = doseRecommended * .2 / input.batch_liters;
	const isMicroscopicDose = spice.doseUnit === "g" && sampleDose < .1;
	const adjustmentProtocol = input.stage === "tincture" ? `1. Preparare tintura separata (${spice.name} in alcool neutro 40-50% per 7-14 giorni). 2. Prelevare 100 mL di birra. 3. Aggiungere tintura goccia a goccia, assaggiare. 4. Annotare gocce necessarie. 5. Scalare: (gocce × volume_totale / 100) = gocce totali.` : isMicroscopicDose ? `1. Preparare una tintura madre con 1,00 g di ${spice.name} in 100 mL di alcool neutro al 40-50%. 2. Estrarre 7 giorni, agitando quotidianamente, quindi filtrare. 3. La tintura rappresenta ~10 mg/mL di spezia caricata (non necessariamente estratta). 4. Prelevare 200 mL di birra. 5. Aggiungere ${(sampleDose * 100).toFixed(1)} mL di tintura. 6. Mescolare, attendere 10-15 minuti e assaggiare. 7. Ripetere a incrementi del 10-20%. Nota: il bench trial con tintura approssima il dosaggio aromatico, ma non necessariamente lo stesso rapporto aroma/amaro/astringenza del contatto diretto.` : spice.doseUnit === "ml" ? `1. Preparare un bench trial: prelevare 200 mL di birra. 2. Aggiungere ${sampleDose.toFixed(1)} mL di concentrato. 3. Mescolare, attendere 10-15 minuti e assaggiare. 4. Regolare la dose principale proporzionalmente.` : `1. Preparare un bench trial: prelevare 200 mL di birra. 2. Aggiungere ${sampleDose.toFixed(1)} g di spezia. 3. Assaggiare dopo ${input.contact_time_hours <= 12 ? input.contact_time_hours : 12} ore. 4. Regolare la dose principale proporzionalmente. 5. Se possibile, usare infusione rimovibile e assaggiare ogni 12-24 ore.`;
	const risks = [...spice.risks];
	if (contributions.pungency > .6) risks.push("Pungenza elevata. Ridurre del 25% e ri-assaggiare.");
	if (contributions.astringency > .5) risks.push("Astringenza significativa. Valutare rimozione anticipata o riduzione dose.");
	if (contributions.bitterness > .5 && input.beer_matrix.ibu && input.beer_matrix.ibu > 50) risks.push("Possibile sommatoria sgradevole con amaro del luppolo (>50 IBU).");
	if (matrix.hopOverlapRisk > .3 && spice.keyVolatiles.some((v) => v.includes("pinene") || v.includes("caryophyllene") || v.includes("limonene"))) risks.push("Rischio di sovrapposizione terpenica con luppoli (pineni, cariofillene, limonene). Può risultare confuso o \"verde\".");
	const compatibilityNotes = [];
	for (const otherName of input.other_spices) {
		const other = findSpice(otherName);
		if (!other || other.id === spice.id) continue;
		const ix = findInteraction(spice.id, other.id);
		if (ix) {
			const emoji = ix.aromaCompatibility > .4 ? "✅" : ix.aromaCompatibility > 0 ? "⚠️" : "❌";
			compatibilityNotes.push(`${emoji} **${other.name}**: ${ix.explanation}`);
			if (ix.pungencySynergy > .5) risks.push(`Sinergia pungente con ${other.name}. Valutare una riduzione iniziale fino al ${Math.round(ix.pungencySynergy * 50)}% se l'altra spezia è già dosata a intensità media o alta.`);
			if (ix.bitternessRisk > .5) risks.push(`Rischio amaro cumulativo con ${other.name}. Considerare rimozione anticipata.`);
			if (ix.astringencyRisk > .6) risks.push(`Alta astringenza cumulativa con ${other.name}. Ridurre le dosi o scegliere una sola spezia dominante.`);
		} else compatibilityNotes.push(`ℹ️ **${other.name}**: nessun dato di interazione specifico. Procedere con bench trial.`);
	}
	const tips = [];
	if (input.stage === "boil") tips.push("Bollitura: aggiungere a -5 minuti per preservare i volatili più delicati.");
	if (input.stage === "whirlpool") tips.push("Whirlpool: 15-30 min a 80-90°C è il punto ottimale per molte spezie.");
	if (input.form === "ground") tips.push("Polvere: difficile da rimuovere. Considerare filtrazione fine o cold crash prima del confezionamento.");
	if (input.form === "whole" && input.stage !== "boil") tips.push("Intero: schiacciare o spezzare leggermente prima dell'uso per favorire l'estrazione.");
	if (input.beer_matrix.roastIntensity > .3) tips.push("I malti tostati mascherano gli aromi delicati. Il dosaggio proposto include già una correzione per questo effetto; confermare comunque tramite bench trial.");
	if (input.beer_matrix.acidity > .3) tips.push("Birra acida: esalta freschezza e agrumi ma può rendere aggressivi zenzero, peperoncino e chiodo di garofano.");
	return {
		doseRecommended: Math.round(doseRecommended * 10) / 10,
		doseMin: Math.round(doseMin * 10) / 10,
		doseMax: Math.round(doseMax * 10) / 10,
		doseUnit: spice.doseUnit,
		dilutionPercent: spice.doseUnit === "ml" ? Math.round(dilutionPercent * 10) / 10 : void 0,
		contributions: {
			aroma: Math.round(contributions.aroma * 100),
			pungency: Math.round(contributions.pungency * 100),
			bitterness: Math.round(contributions.bitterness * 100),
			astringency: Math.round(contributions.astringency * 100),
			cooling: Math.round(contributions.cooling * 100)
		},
		confidence,
		confidenceNotes,
		recommendedMethod,
		adjustmentProtocol,
		risks: [...new Set(risks)],
		compatibilityNotes,
		tips: [...new Set(tips)]
	};
}
function buildChiliUnknownResult(spice, input) {
	return {
		doseRecommended: 0,
		doseMin: 0,
		doseMax: 0,
		doseUnit: spice.doseUnit,
		contributions: {
			aroma: 0,
			pungency: 0,
			bitterness: 0,
			astringency: 0,
			cooling: 0
		},
		confidence: .15,
		confidenceNotes: [
			"IMPOSSIBILE DOSARE senza SHU o capsaicinoidi_mg_per_g.",
			"La capsaicina varia di oltre 100× tra varietà (es. habanero vs ancho).",
			"Fornire il valore SHU della varietà o il contenuto di capsaicinoidi per una stima utile."
		],
		recommendedMethod: "Bench trial obbligatorio: preparare una tintura o infusione separata e aggiungere goccia a goccia su un campione misurato.",
		adjustmentProtocol: "1. Identificare la varietà e il suo SHU. 2. Preparare tintura con 2-5 g di peperoncino secco in 50 mL alcool 50% per 7 gg. 3. Aggiungere goccia a goccia a 100 mL di birra. 4. Scalare dal numero di gocce.",
		risks: [...spice.risks, "Senza SHU, anche un \"peperoncino medio\" può variare da impercettibile a incontrollabile."],
		compatibilityNotes: [],
		tips: [
			"Per birre commerciali, usare estratto standardizzato di capsaicina per ripetibilità.",
			"Ancho/pasilla/guajillo: poco piccanti, più aromatici.",
			"Cayenne/thai: mediamente piccanti.",
			"Habanero/scotch bonnet/ghost: estremamente piccanti."
		]
	};
}
function clamp01(v) {
	return Math.max(0, Math.min(1, v));
}
function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v));
}
function contributionLabel(v) {
	if (v >= 75) return "molto alto";
	if (v >= 55) return "alto";
	if (v >= 35) return "medio";
	if (v >= 15) return "basso";
	return "molto basso";
}
function confidenceLabel(c) {
	if (c >= .75) return "alta";
	if (c >= .5) return "media";
	if (c >= .3) return "bassa";
	return "molto bassa";
}
function formatSpiceResults(input, showDetails) {
	const lines = [];
	lines.push(`# � Botanical Adjunct Calculator: ${input.spice_name} in ${input.batch_liters}L`);
	lines.push("");
	const matches = findAllSpiceMatches(input.spice_name);
	if (matches.length === 0) {
		lines.push(`⚠️ **"${input.spice_name}" non trovato.** Ingredienti disponibili:`);
		for (const s of SPICES) lines.push(`- ${s.name}`);
		return lines.join("\n");
	}
	const spice = matches[0];
	const ambiguous = matches.length > 1 ? matches.slice(1).map((s) => s.name) : [];
	const result = computeSpiceDose(input);
	const formLabel = FORMS[input.form].label;
	const stageLabel = STAGES[input.stage].label;
	lines.push("## 📊 Parametri");
	lines.push("");
	lines.push("| Parametro | Valore |");
	lines.push("|---|---|");
	lines.push(`| Ingrediente | **${spice.name}** |`);
	if (ambiguous.length > 0) lines.push(`| ⚠️ Ambiguità | Trovati anche: ${ambiguous.join(", ")}. Specifica il nome esatto. |`);
	lines.push(`| Intensità desiderata | **${input.intensity === "low" ? "Bassa" : input.intensity === "medium" ? "Media" : "Alta"}** |`);
	lines.push(`| Forma | ${formLabel} |`);
	lines.push(`| Stadio | ${stageLabel} |`);
	lines.push(`| Tempo di contatto | ${input.contact_time_hours} ore |`);
	lines.push(`| Temperatura | ${input.temperature_celsius}°C |`);
	lines.push(`| Freschezza | ${input.freshness === "freshly_cracked" ? "Appena aperto, macinato o preparato" : input.freshness === "recent" ? "Recente / ben conservato" : input.freshness === "older" ? "Conservazione prolungata" : "Condizione sconosciuta"} |`);
	lines.push(`| Volume birra | ${input.batch_liters} L |`);
	lines.push(`| ABV | ${input.beer_matrix.abv}% |`);
	if (input.beer_matrix.finalGravity) lines.push(`| FG | ${input.beer_matrix.finalGravity.toFixed(3)} |`);
	if (input.beer_matrix.ibu) lines.push(`| IBU | ${input.beer_matrix.ibu} |`);
	if (input.beer_matrix.roastIntensity > 0) lines.push(`| Intensità tostato | ${(input.beer_matrix.roastIntensity * 100).toFixed(0)}% |`);
	if (input.beer_matrix.hopAromaIntensity > 0) lines.push(`| Aroma luppolo | ${(input.beer_matrix.hopAromaIntensity * 100).toFixed(0)}% |`);
	if (input.beer_matrix.acidity > 0) lines.push(`| Acidità | ${(input.beer_matrix.acidity * 100).toFixed(0)}% |`);
	if (isChiliInput(input)) {
		if (input.shu) lines.push(`| SHU | ${input.shu} |`);
		if (input.capsaicinoids_mg_per_g) lines.push(`| Capsaicinoidi | ${input.capsaicinoids_mg_per_g} mg/g |`);
	}
	if (input.roast_level) lines.push(`| Livello tostatura | ${input.roast_level} |`);
	if (input.other_spices.length > 0) lines.push(`| Altri ingredienti | ${input.other_spices.join(", ")} |`);
	lines.push("");
	const fmtUnit = result.doseUnit === "ml" ? "mL" : "g";
	const fmtPerLiter = result.doseUnit === "ml" ? "mL/L" : "g/L";
	lines.push("## 🎯 Dosaggio consigliato");
	lines.push("");
	lines.push(`| | ${result.doseUnit === "ml" ? "Millilitri" : "Grammi"} | ${fmtPerLiter} |`);
	lines.push(`|---|---|---|`);
	if (result.doseRecommended > 0) {
		lines.push(`| **Consigliato** | **${result.doseRecommended.toFixed(1)} ${fmtUnit}** | ${(result.doseRecommended / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
		lines.push(`| Min | ${result.doseMin.toFixed(1)} ${fmtUnit} | ${(result.doseMin / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
		lines.push(`| Max | ${result.doseMax.toFixed(1)} ${fmtUnit} | ${(result.doseMax / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
	} else {
		lines.push(`| **Consigliato** | **NON DETERMINABILE** | — |`);
		lines.push(`| Min | NON DETERMINABILE | — |`);
		lines.push(`| Max | NON DETERMINABILE | — |`);
	}
	lines.push("");
	if (result.dilutionPercent !== void 0 && result.dilutionPercent > 0) {
		lines.push(`> 💧 Il concentrato aggiunge **~${result.dilutionPercent.toFixed(1)}%** di volume al batch: considerare la diluizione nel calcolo di ABV e densità.`);
		lines.push("");
	}
	lines.push(`**Confidenza:** ${confidenceLabel(result.confidence)} (${(result.confidence * 100).toFixed(0)}%)`);
	lines.push("");
	lines.push("> ⚠️ Intervallo indicativo basato su euristiche sensoriali ed empiriche. La potenza reale dipende dal lotto specifico, dall'origine e dalla cultivar. **Fare sempre un bench trial.**");
	if (result.confidenceNotes.length > 0) {
		lines.push("");
		lines.push("### Fattori che riducono la confidenza");
		for (const n of result.confidenceNotes) lines.push(`- ${n}`);
	}
	lines.push("");
	if (showDetails) {
		lines.push("## 👃 Contributi sensoriali attesi");
		lines.push("");
		lines.push("| Dimensione | Intensità |");
		lines.push("|---|---|");
		lines.push(`| Aroma | ${contributionLabel(result.contributions.aroma)} (${result.contributions.aroma}%) |`);
		lines.push(`| Pungenza / calore | ${contributionLabel(result.contributions.pungency)} (${result.contributions.pungency}%) |`);
		lines.push(`| Amaro | ${contributionLabel(result.contributions.bitterness)} (${result.contributions.bitterness}%) |`);
		lines.push(`| Astringenza | ${contributionLabel(result.contributions.astringency)} (${result.contributions.astringency}%) |`);
		lines.push(`| Raffrescante | ${contributionLabel(result.contributions.cooling)} (${result.contributions.cooling}%) |`);
		lines.push("");
	}
	lines.push("## 🔧 Metodo consigliato");
	lines.push("");
	lines.push(`> ${result.recommendedMethod}`);
	lines.push("");
	lines.push("### Protocollo di aggiustamento");
	lines.push("");
	lines.push(result.adjustmentProtocol);
	lines.push("");
	if (showDetails && result.compatibilityNotes.length > 0) {
		lines.push("## 🔗 Compatibilità con altri ingredienti");
		lines.push("");
		for (const c of result.compatibilityNotes) lines.push(`- ${c}`);
		lines.push("");
	}
	if (result.tips.length > 0) {
		lines.push("## 💡 Consigli");
		lines.push("");
		for (const t of result.tips) lines.push(`- ${t}`);
		lines.push("");
	}
	if (result.risks.length > 0) {
		lines.push("## ⚠️ Rischi");
		lines.push("");
		for (const r of result.risks) lines.push(`- ${r}`);
		lines.push("");
	}
	if (showDetails) {
		lines.push("## 🧪 Profilo chimico indicativo");
		lines.push("");
		lines.push(`**Volatili principali:** ${spice.keyVolatiles.join(", ")}`);
		lines.push(`**Attivi non volatili:** ${spice.keyActives.join(", ")}`);
		if (spice.oilRangePercent) lines.push(`**Olio essenziale:** ~${spice.oilRangePercent[0].toFixed(1)}–${spice.oilRangePercent[1].toFixed(1)}% (variabile con origine e cultivar)`);
		if (spice.fatRangePercent) lines.push(`**Lipidi / grassi:** ~${spice.fatRangePercent[0].toFixed(1)}–${spice.fatRangePercent[1].toFixed(1)}% (può influenzare ritenzione schiuma)`);
		if (spice.perceptionProfile === "building") lines.push("**Profilo percettivo:** si accumula gradualmente — non giudicare dal primo assaggio.");
		if (spice.perceptionProfile === "persistent") lines.push("**Profilo percettivo:** molto persistente — può dominare anche a dosi moderate.");
		lines.push("");
		lines.push("### Profilo sensoriale di riferimento");
		lines.push("");
		const p = spice.profile;
		lines.push("```");
		lines.push(`Aroma:      ${"█".repeat(Math.round(p.aroma * 20))}${"░".repeat(20 - Math.round(p.aroma * 20))}`);
		lines.push(`Pungenza:   ${"█".repeat(Math.round(p.pungency * 20))}${"░".repeat(20 - Math.round(p.pungency * 20))}`);
		lines.push(`Amaro:      ${"█".repeat(Math.round(p.bitterness * 20))}${"░".repeat(20 - Math.round(p.bitterness * 20))}`);
		lines.push(`Astringenza:${"█".repeat(Math.round(p.astringency * 20))}${"░".repeat(20 - Math.round(p.astringency * 20))}`);
		lines.push(`Raffrescante:${"█".repeat(Math.round(p.cooling * 20))}${"░".repeat(20 - Math.round(p.cooling * 20))}`);
		lines.push("```");
		lines.push("");
		const refUnit = spice.doseUnit === "ml" ? "mL" : "g";
		lines.push("## 📋 Tabella per tutte le intensità");
		lines.push("");
		lines.push(`| Intensità | ${refUnit} (per 20L, forma di riferimento) | Note |`);
		lines.push("|---|---|---|");
		lines.push(`| Bassa | ${spice.low.min}–${spice.low.max} ${refUnit} | ${spice.low.recommend > 0 ? `consigliato ~${spice.low.recommend} ${refUnit}` : "non determinabile senza SHU"} |`);
		lines.push(`| Media | ${spice.medium.min}–${spice.medium.max} ${refUnit} | ${spice.medium.recommend > 0 ? `consigliato ~${spice.medium.recommend} ${refUnit}` : "non determinabile senza SHU"} |`);
		lines.push(`| Alta | ${spice.high.min}–${spice.high.max} ${refUnit} | ${spice.high.recommend > 0 ? `consigliato ~${spice.high.recommend} ${refUnit}` : "non determinabile senza SHU"} |`);
		lines.push("");
		lines.push(`*Forma di riferimento: ${FORMS[spice.referenceForm].label} — ${spice.notes}*`);
		lines.push("");
	}
	lines.push("---");
	lines.push("*I dosaggi sono punti di partenza basati su euristiche sensoriali ed empiriche. La composizione chimica degli oli essenziali varia con origine, cultivar, annata e conservazione. Regola sempre in base al tuo lotto specifico e fai bench trial.*");
	return lines.join("\n");
}
function isChiliInput(input) {
	const matches = findAllSpiceMatches(input.spice_name);
	return matches.length > 0 && matches[0].id === "chili";
}
const SpiceCalculatorInputSchema = object({
	ingredient_name: string().trim().min(1).optional().describe("Nome dell'ingrediente botanico in italiano. Es: \"Pepe nero\", \"Coriandolo\", \"Cold brew coffee\". Alternativa preferita a spice_name."),
	spice_name: string().trim().min(1).optional().describe("Alias legacy di ingredient_name (deprecato, usare ingredient_name)."),
	batch_liters: number().positive().describe("Volume della birra a cui aggiungere la spezia (L)."),
	intensity: _enum([
		"low",
		"medium",
		"high"
	]).default("medium").describe("Intensità desiderata: low, medium, high."),
	form: _enum([
		"whole",
		"cracked",
		"ground",
		"fresh",
		"dried"
	]).default("cracked").describe("Forma fisica della spezia."),
	stage: _enum([
		"mash",
		"boil",
		"whirlpool",
		"fermentation",
		"conditioning",
		"keg",
		"tincture"
	]).default("conditioning").describe("Stadio di aggiunta."),
	contact_time_hours: number().positive().default(72).describe("Tempo di contatto previsto in ore (es. 72 per 3 giorni)."),
	temperature_celsius: number().min(0).max(100).default(20).describe("Temperatura durante il contatto (°C)."),
	freshness: _enum([
		"freshly_cracked",
		"recent",
		"older",
		"unknown"
	]).default("recent").describe("Freschezza della spezia."),
	capsaicinoids_mg_per_g: number().positive().optional().describe("Solo per peperoncino: capsaicinoidi in mg/g."),
	shu: number().positive().optional().describe("Solo per peperoncino: gradi Scoville (SHU)."),
	roast_level: _enum([
		"light",
		"medium",
		"dark"
	]).optional().describe("Livello di tostatura per cacao e caffè: light, medium, dark."),
	wood_toast_level: _enum([
		"untoasted",
		"light",
		"medium",
		"heavy"
	]).optional().describe("Livello di tostatura per legni (rovere): untoasted, light, medium, heavy."),
	liquid_strength_relative: number().positive().optional().describe("Per dosi liquide: concentrazione relativa vs riferimento (1.0 = cold brew 1:5)."),
	coffee_grams_per_liter: number().positive().optional().describe("Per cold brew: grammi di caffè per litro d'acqua usati nella preparazione."),
	prepared_hours_ago: number().min(0).optional().describe("Per dosi liquide: ore trascorse dalla preparazione del concentrato."),
	abv: number().min(0).max(20).default(5).describe("ABV della birra (%)."),
	final_gravity: number().min(1).max(1.2).optional().describe("Gravità finale (es. 1.012)."),
	ibu: number().min(0).max(200).optional().describe("IBU della birra."),
	roast_intensity: number().min(0).max(1).default(0).describe("Intensità dei malti tostati (0-1)."),
	hop_aroma_intensity: number().min(0).max(1).default(0).describe("Intensità aromatica del luppolo (0-1)."),
	acidity: number().min(0).max(1).default(0).describe("Acidità percepita (0-1, 0=non acida)."),
	other_spices: array(string().trim().min(1)).default([]).describe("Altri ingredienti botanici già presenti nella ricetta."),
	other_adjuncts: array(string().trim().min(1)).optional().describe("Alias di other_spices (uniti durante la risoluzione)."),
	show_details: boolean().default(true).describe("Mostra dettagli completi.")
}).superRefine((input, ctx) => {
	if (!input.ingredient_name && !input.spice_name) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["ingredient_name"],
		message: "Fornire ingredient_name (o l'alias legacy spice_name)."
	});
	if (input.stage === "mash" && input.contact_time_hours > 3) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["contact_time_hours"],
		message: "In mash il tempo di contatto è limitato dalla durata del mash (tipicamente ≤2 ore)."
	});
	if (input.stage === "boil" && input.contact_time_hours > 3) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["contact_time_hours"],
		message: "In bollitura il tempo di contatto è limitato dalla durata della bollitura (tipicamente ≤2 ore)."
	});
});
const SPICE_CALCULATOR_PARAMETERS = {
	type: "object",
	properties: {
		ingredient_name: {
			type: "string",
			description: "Nome dell'ingrediente botanico in italiano. Es: \"Pepe nero\", \"Coriandolo\", \"Cacao in granella\", \"Cold brew coffee\"."
		},
		spice_name: {
			type: "string",
			description: "Alias legacy di ingredient_name (deprecato)."
		},
		batch_liters: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Volume della birra a cui aggiungere la spezia (L)."
		},
		intensity: {
			type: "string",
			enum: [
				"low",
				"medium",
				"high"
			],
			default: "medium",
			description: "Intensità desiderata: low (bassa), medium (media), high (alta)."
		},
		form: {
			type: "string",
			enum: [
				"whole",
				"cracked",
				"ground",
				"fresh",
				"dried"
			],
			default: "cracked",
			description: "Forma fisica: whole (intero), cracked (spezzato), ground (macinato), fresh (fresco), dried (essiccato)."
		},
		stage: {
			type: "string",
			enum: [
				"mash",
				"boil",
				"whirlpool",
				"fermentation",
				"conditioning",
				"keg",
				"tincture"
			],
			default: "conditioning",
			description: "Stadio di aggiunta: mash, boil (bollitura), whirlpool, fermentation, conditioning (maturazione/dry-spice), keg (fusto), tincture (tintura separata)."
		},
		contact_time_hours: {
			type: "number",
			exclusiveMinimum: 0,
			default: 72,
			description: "Tempo di contatto previsto in ore (es. 72 per 3 giorni)."
		},
		temperature_celsius: {
			type: "number",
			minimum: 0,
			maximum: 100,
			default: 20,
			description: "Temperatura durante il contatto (°C)."
		},
		freshness: {
			type: "string",
			enum: [
				"freshly_cracked",
				"recent",
				"older",
				"unknown"
			],
			default: "recent",
			description: "Freschezza: freshly_cracked (appena spezzata), recent (recente), older (non freschissima), unknown (sconosciuta)."
		},
		capsaicinoids_mg_per_g: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Solo per peperoncino: contenuto di capsaicinoidi in mg/g."
		},
		shu: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Solo per peperoncino: gradi Scoville (SHU). Es: cayenna ~40000, habanero ~200000."
		},
		roast_level: {
			type: "string",
			enum: [
				"light",
				"medium",
				"dark"
			],
			description: "Livello di tostatura per caffè/cacao: light (chiaro), medium (medio), dark (scuro)."
		},
		wood_toast_level: {
			type: "string",
			enum: [
				"untoasted",
				"light",
				"medium",
				"heavy"
			],
			description: "Livello di tostatura per legni (rovere): untoasted, light, medium, heavy."
		},
		liquid_strength_relative: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Per dosi liquide: concentrazione relativa vs riferimento (1.0 = cold brew 1:5)."
		},
		coffee_grams_per_liter: {
			type: "number",
			exclusiveMinimum: 0,
			description: "Per cold brew: grammi di caffè per litro d'acqua usati nella preparazione."
		},
		prepared_hours_ago: {
			type: "number",
			minimum: 0,
			description: "Per dosi liquide: ore trascorse dalla preparazione del concentrato."
		},
		abv: {
			type: "number",
			minimum: 0,
			maximum: 20,
			default: 5,
			description: "ABV della birra (%)."
		},
		final_gravity: {
			type: "number",
			minimum: 1,
			maximum: 1.2,
			description: "Gravità finale (es. 1.012). Opzionale."
		},
		ibu: {
			type: "number",
			minimum: 0,
			maximum: 200,
			description: "IBU della birra. Opzionale."
		},
		roast_intensity: {
			type: "number",
			minimum: 0,
			maximum: 1,
			default: 0,
			description: "Intensità dei malti tostati (0 = nessuno, 1 = molto tostato)."
		},
		hop_aroma_intensity: {
			type: "number",
			minimum: 0,
			maximum: 1,
			default: 0,
			description: "Intensità aromatica del luppolo (0 = nessuna, 1 = molto luppolata)."
		},
		acidity: {
			type: "number",
			minimum: 0,
			maximum: 1,
			default: 0,
			description: "Acidità percepita (0 = non acida, 1 = molto acida)."
		},
		other_spices: {
			type: "array",
			items: {
				type: "string",
				minLength: 1
			},
			default: [],
			description: "Altri ingredienti botanici già presenti nella ricetta per analisi di compatibilità."
		},
		other_adjuncts: {
			type: "array",
			items: {
				type: "string",
				minLength: 1
			},
			description: "Alias di other_spices."
		},
		show_details: {
			type: "boolean",
			default: true,
			description: "Mostra dettagli completi (contributi sensoriali, profilo chimico, rischi)."
		}
	},
	required: ["batch_liters"],
	additionalProperties: false
};
var BotanicalAdjunctCalculatorTool = class {
	name = "botanical_adjunct_calculator";
	description = "Stima il dosaggio di ingredienti botanici per birra: spezie, scorze, cacao, caffè, tè, erbe, legni. Separa dose aromatica (volatili) dalla dose chemestetica (pungenza, calore). Considera forma, stadio, tempo, temperatura, matrice della birra, interazioni e freschezza. Supporta parametri specifici per categoria: SHU per peperoncino, roast_level per caffè/cacao. Restituisce intervallo con confidenza e protocollo di aggiustamento incrementale.";
	parameters = SPICE_CALCULATOR_PARAMETERS;
	resolveExecution(args) {
		const resolvedName = args.ingredient_name ?? args.spice_name ?? "";
		const resolvedOthers = [...new Set([...args.other_spices ?? [], ...args.other_adjuncts ?? []].map((s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase()))];
		return {
			description: `Botanical calc: ${resolvedName} @ ${args.intensity}`,
			approvalRule: this.name,
			execute: () => {
				try {
					const input = {
						spice_name: resolvedName,
						batch_liters: args.batch_liters,
						intensity: args.intensity ?? "medium",
						form: args.form ?? "cracked",
						stage: args.stage ?? "conditioning",
						contact_time_hours: args.contact_time_hours ?? 72,
						temperature_celsius: args.temperature_celsius ?? 20,
						freshness: args.freshness ?? "recent",
						capsaicinoids_mg_per_g: args.capsaicinoids_mg_per_g,
						shu: args.shu,
						roast_level: args.roast_level,
						wood_toast_level: args.wood_toast_level,
						liquid_strength_relative: args.liquid_strength_relative,
						coffee_grams_per_liter: args.coffee_grams_per_liter,
						prepared_hours_ago: args.prepared_hours_ago,
						beer_matrix: {
							abv: args.abv ?? 5,
							finalGravity: args.final_gravity,
							ibu: args.ibu,
							roastIntensity: args.roast_intensity ?? 0,
							hopAromaIntensity: args.hop_aroma_intensity ?? 0,
							acidity: args.acidity ?? 0
						},
						other_spices: resolvedOthers
					};
					return Promise.resolve({ output: formatSpiceResults(input, args.show_details) });
				} catch (e) {
					return Promise.resolve({
						isError: true,
						output: e instanceof Error ? e.message : String(e)
					});
				}
			}
		};
	}
};
registerTool(BotanicalAdjunctCalculatorTool);

//#endregion
//#region src/brewing/tincture-calculator.ts
/**
* Tincture calculator — plan alcoholic tinctures for brewing.
*
* Computes the solvent recipe (alcohol 95° + water → target ABV), the
* ingredient-to-solvent ratio, extraction time, preparation and filtration
* steps, a bench-trial dosing protocol, and an estimated batch dose with
* alcohol contribution. Also flags safety concerns for risky botanicals.
*
* Covers: hops, woods, seed spices, bark/root spices, fresh herbs, dried
* herbs/flowers, citrus peels, chili, coffee, cocoa, vanilla, and fruit.
*
* ⚠️ A tincture is NOT a replacement for dry hopping. It is a corrective,
* experimental, or blending tool. The bench trial is MANDATORY — the tool
* will not compute a batch dose without test-sample parameters.
*
* Important caveats: extraction kinetics vary enormously with cultivar, lot,
* particle size, roast level, and storage age. The preset ratios are
* starting points, not guarantees. Always bench-trial before dosing a batch.
*/
const CATEGORIES = [
	"hop",
	"wood",
	"seed_spice",
	"bark_root",
	"fresh_herb",
	"dried_herb",
	"citrus_peel",
	"chili",
	"coffee",
	"cacao",
	"vanilla",
	"fruit",
	"other"
];
const INGREDIENT_STATES = [
	"fresh",
	"dried",
	"pellet",
	"whole",
	"ground",
	"crushed",
	"chips",
	"cubes"
];
const ALLOWED_STATES = {
	hop: ["pellet", "whole"],
	wood: ["chips", "cubes"],
	seed_spice: [
		"whole",
		"crushed",
		"ground"
	],
	bark_root: [
		"whole",
		"crushed",
		"ground"
	],
	fresh_herb: ["fresh"],
	dried_herb: ["dried", "crushed"],
	citrus_peel: ["fresh", "dried"],
	chili: [
		"fresh",
		"dried",
		"crushed"
	],
	coffee: ["whole", "ground"],
	cacao: ["whole", "crushed"],
	vanilla: ["whole"],
	fruit: ["fresh", "dried"],
	other: [...INGREDIENT_STATES]
};
function resolveState(preset, state) {
	if (preset.states[state]) return preset.states[state];
	return preset.states["default"];
}
const CATEGORY_PRESETS = {
	hop: {
		abvRange: [45, 55],
		abvRecommended: 50,
		states: {
			pellet: {
				ratio: 1 / 10,
				minDays: .5,
				maxDays: 2,
				tempC: 10
			},
			whole: {
				ratio: 1 / 12,
				minDays: .5,
				maxDays: 2,
				tempC: 10
			},
			default: {
				ratio: 1 / 10,
				minDays: .5,
				maxDays: 2,
				tempC: 10
			}
		},
		timeRange: "12–48 ore",
		tempRange: "4–15 °C",
		notes: "Usare pellet o coni freschi. Minima esposizione all'aria. Questo preset è un'euristica sperimentale — NON sostituisce il dry hopping.",
		hasFermentables: false,
		label: "Luppolo"
	},
	hop_cold_short: {
		abvRange: [60, 70],
		abvRecommended: 65,
		states: {
			pellet: {
				ratio: 1 / 10,
				minDays: .17,
				maxDays: .5,
				tempC: 4
			},
			whole: {
				ratio: 1 / 12,
				minDays: .17,
				maxDays: .5,
				tempC: 4
			},
			default: {
				ratio: 1 / 10,
				minDays: .17,
				maxDays: .5,
				tempC: 4
			}
		},
		timeRange: "4–12 ore",
		tempRange: "0–8 °C",
		notes: "Tecnica sperimentale a contatto breve, pensata per limitare l'estrazione prolungata di materiale vegetale. Non garantisce minore estrazione di resine, polifenoli o sostanze amare.",
		hasFermentables: false,
		label: "Luppolo (estrazione breve/fredda)"
	},
	wood: {
		abvRange: [45, 65],
		abvRecommended: 55,
		states: {
			chips: {
				ratio: 1 / 7,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			},
			cubes: {
				ratio: 1 / 5,
				minDays: 14,
				maxDays: 42,
				tempC: 18
			},
			default: {
				ratio: 1 / 7,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			}
		},
		timeRange: "3–42 giorni (chips: 3–14, cubes: 14–42)",
		tempRange: "15–22 °C",
		notes: "Solo legno certificato alimentare. Mai legno da falegnameria. 40-50%: più tannino/legnosità. 55-65%: più vanillina/oak lactones.",
		hasFermentables: false,
		label: "Legno"
	},
	seed_spice: {
		abvRange: [45, 60],
		abvRecommended: 50,
		states: {
			crushed: {
				ratio: 1 / 10,
				minDays: .5,
				maxDays: 7,
				tempC: 18
			},
			whole: {
				ratio: 1 / 8,
				minDays: 1,
				maxDays: 10,
				tempC: 18
			},
			ground: {
				ratio: 1 / 15,
				minDays: .25,
				maxDays: 2,
				tempC: 18
			},
			default: {
				ratio: 1 / 10,
				minDays: .5,
				maxDays: 7,
				tempC: 18
			}
		},
		timeRange: "12 ore – 7 giorni",
		tempRange: "15–22 °C",
		notes: "Schiacciare grossolanamente, NON polverizzare. L'aumento estremo della superficie estrae note resinose/medicinali.",
		hasFermentables: false,
		label: "Spezie-seme"
	},
	bark_root: {
		abvRange: [50, 70],
		abvRecommended: 60,
		states: {
			crushed: {
				ratio: 1 / 10,
				minDays: 3,
				maxDays: 21,
				tempC: 18
			},
			whole: {
				ratio: 1 / 8,
				minDays: 5,
				maxDays: 30,
				tempC: 18
			},
			default: {
				ratio: 1 / 10,
				minDays: 3,
				maxDays: 21,
				tempC: 18
			}
		},
		timeRange: "3–21 giorni",
		tempRange: "15–22 °C",
		notes: "Cannella di Ceylon preferita alla cassia (più delicata). Genziana: 2-5g, dosare a gocce. Liquirizia: aumenta dolcezza percepita.",
		hasFermentables: false,
		label: "Corteccia/radice"
	},
	fresh_herb: {
		abvRange: [55, 70],
		abvRecommended: 65,
		states: {
			fresh: {
				ratio: 1 / 3,
				minDays: .17,
				maxDays: 2,
				tempC: 10
			},
			default: {
				ratio: 1 / 3,
				minDays: .17,
				maxDays: 2,
				tempC: 10
			}
		},
		timeRange: "4–48 ore",
		tempRange: "4–15 °C",
		notes: "Le erbe fresche contengono molta acqua → gradazione effettiva inferiore. Rosmarino/salvia: controllare dopo 4–6 ore.",
		hasFermentables: false,
		label: "Erbe fresche"
	},
	dried_herb: {
		abvRange: [35, 55],
		abvRecommended: 45,
		states: {
			dried: {
				ratio: 1 / 15,
				minDays: .25,
				maxDays: 7,
				tempC: 18
			},
			crushed: {
				ratio: 1 / 20,
				minDays: .17,
				maxDays: 2,
				tempC: 18
			},
			default: {
				ratio: 1 / 15,
				minDays: .25,
				maxDays: 7,
				tempC: 18
			}
		},
		timeRange: "6 ore – 7 giorni (fiori delicati: 6–48 ore)",
		tempRange: "15–22 °C",
		notes: "Lavanda: estremamente facile da sovradosare (può ricordare sapone). Ibisco: usare 25-40% ABV per colore e acidità.",
		hasFermentables: false,
		label: "Erbe essiccate / fiori"
	},
	citrus_peel: {
		abvRange: [60, 75],
		abvRecommended: 70,
		states: {
			fresh: {
				ratio: 1 / 5,
				minDays: .5,
				maxDays: 7,
				tempC: 18
			},
			dried: {
				ratio: 1 / 12,
				minDays: .5,
				maxDays: 7,
				tempC: 18
			},
			default: {
				ratio: 1 / 6,
				minDays: .5,
				maxDays: 7,
				tempC: 18
			}
		},
		timeRange: "12 ore – 7 giorni",
		tempRange: "15–22 °C",
		notes: "Solo scorze NON trattate, senza cere. Ridurre al minimo l'albedo (amaro, pectina). Preparare agrumi diversi separatamente.",
		hasFermentables: false,
		label: "Scorze agrumi"
	},
	chili: {
		abvRange: [60, 75],
		abvRecommended: 70,
		states: {
			dried: {
				ratio: 1 / 20,
				minDays: .25,
				maxDays: 7,
				tempC: 18
			},
			fresh: {
				ratio: 1 / 10,
				minDays: .25,
				maxDays: 7,
				tempC: 18
			},
			default: {
				ratio: 1 / 20,
				minDays: .25,
				maxDays: 7,
				tempC: 18
			}
		},
		timeRange: "6 ore – 7 giorni",
		tempRange: "15–22 °C",
		notes: "Usare guanti. Capsaicina molto solubile in etanolo. NON assaggiare la tintura pura. Dose iniziale: 1 goccia in 100 mL.",
		hasFermentables: false,
		label: "Peperoncino"
	},
	coffee: {
		abvRange: [20, 40],
		abvRecommended: 30,
		states: {
			ground: {
				ratio: 1 / 7,
				minDays: .5,
				maxDays: 2,
				tempC: 10
			},
			whole: {
				ratio: 1 / 4,
				minDays: 1,
				maxDays: 3,
				tempC: 10
			},
			default: {
				ratio: 1 / 7,
				minDays: .5,
				maxDays: 2,
				tempC: 10
			}
		},
		timeRange: "12–48 ore",
		tempRange: "4–15 °C",
		notes: "Macinatura GROSSOLANA (french press), mai fine (espresso). Il cold brew con sola acqua dà spesso risultati migliori, ma la tintura idroalcolica ha più stabilità.",
		hasFermentables: false,
		label: "Caffè"
	},
	cacao: {
		abvRange: [45, 60],
		abvRecommended: 50,
		states: {
			whole: {
				ratio: 1 / 4,
				minDays: 5,
				maxDays: 21,
				tempC: 18
			},
			crushed: {
				ratio: 1 / 4,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			},
			default: {
				ratio: 1 / 4,
				minDays: 5,
				maxDays: 21,
				tempC: 18
			}
		},
		timeRange: "5–21 giorni",
		tempRange: "15–22 °C",
		notes: "I nibs contengono grassi: la tintura può diventare torbida/oleosa. Filtrare, raffreddare 24-48h, rimuovere strato grasso, rifiltrare su carta.",
		hasFermentables: false,
		label: "Cacao"
	},
	vanilla: {
		abvRange: [40, 60],
		abvRecommended: 50,
		states: {
			whole: {
				ratio: .04,
				minDays: 14,
				maxDays: 60,
				tempC: 18
			},
			default: {
				ratio: .04,
				minDays: 14,
				maxDays: 60,
				tempC: 18
			}
		},
		timeRange: "14–60 giorni",
		tempRange: "15–22 °C",
		notes: "Aprire longitudinalmente, raschiare semi, inserire semi + baccello. Il rapporto è calcolato in grammi: ~3g di baccello ogni 75 mL (1:25 g/mL). Per 1 baccello intero (~2-4g), il solvente calcolato sarà circa 50-100 mL.",
		hasFermentables: false,
		label: "Vaniglia"
	},
	fruit: {
		abvRange: [60, 75],
		abvRecommended: 70,
		states: {
			fresh: {
				ratio: 1 / 1.5,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			},
			dried: {
				ratio: 1 / 4,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			},
			default: {
				ratio: 1 / 1.5,
				minDays: 3,
				maxDays: 14,
				tempC: 18
			}
		},
		timeRange: "3–14 giorni",
		tempRange: "15–22 °C",
		notes: "La frutta contiene molta acqua e zuccheri fermentabili. Per molte birre è meglio purea asettica o succo. La tintura ha senso per scorze, frutti di bosco aromatici, ciliegie essiccate, bucce.",
		hasFermentables: true,
		label: "Frutta"
	},
	other: {
		abvRange: [40, 60],
		abvRecommended: 50,
		states: { default: {
			ratio: 1 / 10,
			minDays: 3,
			maxDays: 14,
			tempC: 18
		} },
		timeRange: "3–14 giorni",
		tempRange: "15–22 °C",
		notes: "Categoria generica. Verificare sempre la sicurezza alimentare. Una concentrazione alcolica può estrarre composti pericolosi.",
		hasFermentables: false,
		label: "Altro"
	}
};
const SAFETY_DB = [
	{
		id: "calamo",
		aliases: [
			"calamo",
			"calamus",
			"calamo aromatico",
			"acorus calamus",
			"sweet flag"
		],
		warnings: ["🚫 Il calamo aromatico contiene β-asarone, potenzialmente cancerogeno. Vietato in UE e USA. NON USARE."]
	},
	{
		id: "genziana",
		aliases: [
			"genziana",
			"gentian",
			"gentiana",
			"gentiana lutea"
		],
		warnings: ["⚠️ Estremamente amara. Usare massimo 2-5g. Dosare a gocce."]
	},
	{
		id: "salvia",
		aliases: [
			"salvia",
			"sage",
			"salvia officinalis"
		],
		warnings: ["⚠️ Può diventare canforata/medicinale rapidamente. Controllare dopo 4-6 ore."]
	},
	{
		id: "rosmarino",
		aliases: [
			"rosmarino",
			"rosemary",
			"rosmarinus officinalis"
		],
		warnings: ["⚠️ Può diventare canforato/medicinale rapidamente. Controllare dopo 4-6 ore."]
	},
	{
		id: "lavanda",
		aliases: [
			"lavanda",
			"lavender",
			"lavandula",
			"lavandula angustifolia"
		],
		warnings: ["⚠️ Facile sovradosare (sapone/deodorante). Rapporto 1:15-1:25."]
	},
	{
		id: "peperoncino",
		aliases: [
			"peperoncino",
			"chili",
			"chilli",
			"chile",
			"habanero",
			"jalapeño",
			"jalapeno",
			"cayenna",
			"cayenne",
			"calabrese"
		],
		warnings: ["⚠️ NON assaggiare la tintura pura. Usare guanti. Capsaicina molto solubile in etanolo."]
	},
	{
		id: "sambuco",
		aliases: [
			"sambuco",
			"elderberry",
			"sambucus",
			"elder",
			"sambuco nero"
		],
		warnings: ["🚫 NON usare bacche/semi crudi (cianuro). Solo fiori o bacche cotte."]
	},
	{
		id: "assenzio",
		aliases: [
			"assenzio",
			"wormwood",
			"artemisia absinthium",
			"artemisia"
		],
		warnings: ["🚫 Contiene tujone, regolamentato. Verificare limiti legali prima dell'uso."]
	},
	{
		id: "noce_moscata",
		aliases: [
			"noce moscata",
			"nutmeg",
			"myristica fragrans"
		],
		warnings: ["⚠️ Contiene miristicina. >5g può causare effetti tossici. Mantenere dosi molto basse."]
	},
	{
		id: "fava_tonka",
		aliases: [
			"fava tonka",
			"tonka bean",
			"tonka",
			"dipteryx odorata"
		],
		warnings: ["🚫 Contiene cumarina. Vietata in USA come ingrediente alimentare. Limitata in UE."]
	},
	{
		id: "ginepro",
		aliases: [
			"ginepro",
			"juniper",
			"juniperus communis"
		],
		warnings: ["⚠️ Oli essenziali irritanti in grandi quantità. Schiacciare leggermente, non polverizzare."]
	}
];
function normalizeForMatch(text) {
	return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}
function getSafetyWarnings(ingredient, category) {
	const query = normalizeForMatch(ingredient);
	const warnings = [];
	for (const entry of SAFETY_DB) for (const alias of entry.aliases) if (normalizeForMatch(alias) === query) {
		warnings.push(...entry.warnings);
		break;
	}
	if (category === "wood") warnings.push("⚠️ Solo legno certificato alimentare. Mai legno da falegnameria.");
	if (category === "citrus_peel") warnings.push("⚠️ Solo scorze non trattate, senza cere. Ridurre albedo al minimo.");
	return [...new Set(warnings)];
}
/**
* Compute the volume of 95° alcohol and water needed to produce `targetVolumeMl`
* of solvent at `targetAbvPercent`.
*
* V_source = (ABV_target / ABV_source) × V_target
* Water then fills to target volume.
*
* Note: water–ethanol volumes are not perfectly additive; this is an
* approximation. Best practice: pour alcohol first, add water, then top up
* to final volume.
*/
function computeDilution(sourceAbvPercent, targetAbvPercent, targetVolumeMl) {
	const alcoholMl = targetAbvPercent / sourceAbvPercent * targetVolumeMl;
	const waterMl = targetVolumeMl - alcoholMl;
	return {
		alcoholMl: Math.round(alcoholMl * 10) / 10,
		waterMl: Math.round(waterMl * 10) / 10
	};
}
function solventVolumeFromRatio(ingredientWeightG, ratio) {
	if (ratio <= 0) return 0;
	return Math.round(ingredientWeightG / ratio);
}
const PlanInputSchema = object({
	mode: literal("plan").default("plan"),
	ingredient: string().trim().min(1).describe("Nome dell'ingrediente (es. \"Luppolo Citra\", \"Quercia francese\", \"Coriandolo\")."),
	category: _enum(CATEGORIES).describe("Categoria dell'ingrediente. Determina i preset di estrazione."),
	ingredient_weight_g: number().positive().describe("Peso dell'ingrediente in grammi."),
	ingredient_state: _enum(INGREDIENT_STATES).describe("Stato fisico dell'ingrediente."),
	source_abv_percent: number().min(1).max(100).default(95).describe("Gradazione dell'alcol di partenza (95° in Italia)."),
	target_abv_percent: number().min(1).max(100).optional().describe("Gradazione target della tintura. Se omesso, usa il preset della categoria."),
	solvent_volume_ml: number().positive().optional().describe("Volume di solvente in mL. Se omesso, calcolato dal rapporto ingrediente/solvente."),
	extraction_time_days: number().positive().optional().describe("Tempo di estrazione in giorni. Se omesso, usa il preset."),
	extraction_temp_c: number().min(0).max(40).optional().describe("Temperatura di estrazione in °C. Se omesso, usa il preset."),
	hop_variant: _enum(["standard", "cold_short"]).optional().describe("Per luppolo: \"standard\" o \"cold_short\"."),
	ingredient_water_percent: number().min(0).max(100).optional().describe("Contenuto d'acqua dell'ingrediente (g/100g)."),
	ingredient_sugar_percent: number().min(0).max(100).optional().describe("Zuccheri nell'ingrediente (g/100g)."),
	food_safe_confirmed: boolean().optional().describe("OBBLIGATORIO per categoria \"other\"."),
	custom_ratio: number().positive().optional().describe("Rapporto personalizzato g/mL. NON usare insieme a solvent_volume_ml."),
	show_details: boolean().default(true).describe("Mostra la guida completa.")
}).superRefine((input, ctx) => {
	if (input.target_abv_percent !== void 0 && input.target_abv_percent > input.source_abv_percent) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["target_abv_percent"],
		message: `La gradazione target (${input.target_abv_percent}%) non può superare quella di partenza (${input.source_abv_percent}%).`
	});
	if (input.category === "other" && !input.food_safe_confirmed) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["food_safe_confirmed"],
		message: "Categoria \"other\" richiede food_safe_confirmed: true."
	});
	if (!ALLOWED_STATES[input.category].includes(input.ingredient_state)) ctx.addIssue({
		code: ZodIssueCode.custom,
		path: ["ingredient_state"],
		message: `Lo stato "${input.ingredient_state}" non è compatibile con "${input.category}". Stati validi: ${ALLOWED_STATES[input.category].join(", ")}.`
	});
	if (input.custom_ratio !== void 0 && input.solvent_volume_ml !== void 0) {
		const expectedMl = input.ingredient_weight_g / input.custom_ratio;
		if (Math.abs(expectedMl - input.solvent_volume_ml) / expectedMl > .05) ctx.addIssue({
			code: ZodIssueCode.custom,
			path: ["solvent_volume_ml"],
			message: `solvent_volume_ml (${input.solvent_volume_ml} mL) e custom_ratio incoerenti: il rapporto richiederebbe ~${Math.round(expectedMl)} mL.`
		});
	}
});
const DoseInputSchema = object({
	mode: literal("dose"),
	ingredient: string().trim().min(1).describe("Nome dell'ingrediente."),
	category: _enum(CATEGORIES).describe("Categoria."),
	beer_volume_l: number().positive().describe("Volume EFFETTIVO della birra nel fermentatore/keg (L)."),
	test_sample_ml: number().positive().describe("Volume campione per bench trial (es. 100 mL)."),
	test_dose_ml: number().positive().describe("Dose scelta nel campione (mL)."),
	recovered_tincture_volume_ml: number().positive().optional().describe("Volume di tintura realmente recuperato dopo filtrazione (mL)."),
	tincture_abv_percent: number().min(0).max(100).optional().describe("ABV reale o stimata della tintura (se omesso, default 50%)."),
	ingredient_sugar_percent: number().min(0).max(100).optional().describe("Zuccheri nell'ingrediente (g/100g). Per avviso fermentabili."),
	show_details: boolean().default(true)
});
const TinctureCalculatorInputSchema = discriminatedUnion("mode", [PlanInputSchema, DoseInputSchema]);
function planTincture(input) {
	const presetKey = input.category === "hop" && input.hop_variant === "cold_short" ? "hop_cold_short" : input.category;
	const preset = CATEGORY_PRESETS[presetKey] ?? CATEGORY_PRESETS["other"];
	if (!preset) throw new Error(`Categoria "${presetKey}" non trovata.`);
	const targetAbv = input.target_abv_percent ?? preset.abvRecommended;
	const statePreset = resolveState(preset, input.ingredient_state);
	const ratio = input.custom_ratio ?? statePreset.ratio;
	const solventMl = input.solvent_volume_ml ?? solventVolumeFromRatio(input.ingredient_weight_g, ratio);
	const { alcoholMl, waterMl } = computeDilution(input.source_abv_percent, targetAbv, solventMl);
	let effectiveAbvPercent = null;
	if (input.ingredient_water_percent !== void 0 && input.ingredient_water_percent > 0) {
		const tv = solventMl + input.ingredient_weight_g * (input.ingredient_water_percent / 100);
		effectiveAbvPercent = tv > 0 ? Math.round(alcoholMl * (input.source_abv_percent / 100) / tv * 100 * 100) / 100 : null;
	}
	const extractionDays = input.extraction_time_days;
	const minHours = extractionDays ? extractionDays * 24 : statePreset.minDays * 24;
	const maxHours = extractionDays ? extractionDays * 24 : statePreset.maxDays * 24;
	const extractionTime = extractionDays ? extractionDays < 1 ? `${Math.round(extractionDays * 24)} ore` : extractionDays < 14 ? `${extractionDays} giorni` : `${extractionDays} giorni (${Math.round(extractionDays / 7)} settimane)` : preset.timeRange;
	const tempC = input.extraction_temp_c ?? statePreset.tempC;
	const actualRatio = input.ingredient_weight_g / solventMl;
	const ratioLabel = `1:${Math.round(1 / actualRatio)} (${input.ingredient_weight_g}g / ${solventMl}mL → ${(actualRatio * 100).toFixed(1)} g/100mL)`;
	const preparation = [`Pesare ${input.ingredient_weight_g}g di ${input.ingredient} (${preset.label}).`];
	switch (input.ingredient_state) {
		case "fresh":
			preparation.push("Lavare solo se necessario, asciugare perfettamente.", "Eliminare parti danneggiate.");
			break;
		case "dried":
			preparation.push("NON polverizzare: schiacciare o spezzare solo quanto necessario.");
			break;
		case "pellet":
			preparation.push("Non macinare ulteriormente i pellet.");
			break;
		case "whole":
			preparation.push("Spezzare o schiacciare leggermente per aumentare la superficie.");
			break;
		case "ground":
			preparation.push("Usare macinatura grossolana. Evitare polveri fini.");
			break;
		case "crushed":
			preparation.push("Schiacciatura grossolana — sufficiente per superficie senza polveri.");
			break;
		case "chips":
			preparation.push("Non serve ulteriore preparazione.");
			break;
		case "cubes": preparation.push("Non serve ulteriore preparazione. I cubes estraggono più lentamente dei chips.");
	}
	switch (input.category) {
		case "vanilla":
			preparation.push("Aprire longitudinalmente, raschiare semi, inserire semi + baccello.");
			break;
		case "citrus_peel":
			preparation.push("Rimuovere l'albedo bianco. Usare solo la scorza colorata.");
			break;
		case "chili":
			preparation.push("⚠️ Guanti. Rimuovere parte della placenta. Preparare varietà separate.");
			break;
		case "coffee":
			preparation.push("Macinatura GROSSOLANA (french press). Mai fine (espresso).");
			break;
		case "cacao":
			preparation.push("Se non tostati, tostare i nibs (150°C × 10 min).");
			break;
		case "fresh_herb": preparation.push("Non triturare finemente. Foglie intere o spezzate.");
	}
	preparation.push(`Preparare solvente: ${alcoholMl} mL alcol ${input.source_abv_percent}° + ${waterMl} mL acqua → ${solventMl} mL al ${targetAbv}%.`, "Versare PRIMA l'alcol, POI l'acqua (volumi non additivi).", "Usare ESCLUSIVAMENTE alcol alimentare non denaturato e acqua demineralizzata.", "Inserire ingrediente e solvente in VETRO sanificato. Chiudere ermeticamente.", `Conservare al buio a ${tempC}°C circa.`);
	const agitation = input.category === "hop" ? "Agitazione MINIMA (rischio ossidazione). Una volta al giorno, delicatamente." : "Agitare delicatamente una volta al giorno.";
	const filtration = ["Filtrare grossolanamente con colino fine a maglia inox.", "Lasciare sedimentare 12–48 ore in frigorifero."];
	if (input.category === "cacao") filtration.push("Rimuovere strato grasso superficiale dopo raffreddamento.");
	filtration.push("Filtrare con carta (filtro da caffè) o membrana fine.");
	filtration.push("Conservare in bottiglia di vetro scuro, ben chiusa, al fresco e al buio.");
	let doseLow = .02, doseMid = .1, doseHigh = .3;
	switch (input.category) {
		case "chili":
			doseLow = .005;
			doseMid = .02;
			doseHigh = .05;
			break;
		case "hop":
			doseLow = .05;
			doseMid = .2;
			doseHigh = .4;
			break;
		case "wood":
			doseLow = .1;
			doseMid = .5;
			doseHigh = 1;
			break;
		case "vanilla":
			doseLow = .1;
			doseMid = .3;
			doseHigh = .5;
			break;
		case "seed_spice":
		case "bark_root":
			doseLow = .02;
			doseMid = .1;
			doseHigh = .3;
			break;
		case "citrus_peel":
			doseLow = .02;
			doseMid = .15;
			doseHigh = .3;
			break;
		case "coffee":
			doseLow = .05;
			doseMid = .15;
			doseHigh = .3;
			break;
		case "cacao":
			doseLow = .1;
			doseMid = .5;
			doseHigh = 1;
			break;
		case "fresh_herb":
		case "dried_herb":
			doseLow = .05;
			doseMid = .2;
			doseHigh = .5;
			break;
		case "fruit":
			doseLow = .1;
			doseMid = .5;
			doseHigh = 1;
			break;
		default:
			doseLow = .05;
			doseMid = .15;
			doseHigh = .4;
	}
	const sampleMl = 100;
	const scaleDose = (mlPer100) => Math.round(mlPer100 * sampleMl / 100 * 1e3) / 1e3;
	const defaultRecFrac = input.category === "hop" && input.ingredient_state === "pellet" ? .55 : input.category === "coffee" && input.ingredient_state === "ground" ? .5 : input.category === "cacao" ? .6 : input.category === "fresh_herb" ? .5 : input.category === "fruit" && input.ingredient_state === "fresh" ? .55 : .75;
	const warnings = getSafetyWarnings(input.ingredient, input.category);
	if (input.target_abv_percent !== void 0 && (targetAbv < preset.abvRange[0] || targetAbv > preset.abvRange[1])) warnings.push(`⚠️ ABV target ${targetAbv}% fuori dal preset (${preset.abvRange[0]}–${preset.abvRange[1]}%).`);
	if (extractionDays !== void 0 && (extractionDays < statePreset.minDays || extractionDays > statePreset.maxDays)) warnings.push(`⚠️ Tempo (${extractionDays}gg) fuori dal range ${input.category}/${input.ingredient_state} (${statePreset.minDays}–${statePreset.maxDays}gg).`);
	if (input.extraction_temp_c !== void 0 && input.extraction_temp_c !== statePreset.tempC) warnings.push(`⚠️ Temperatura (${input.extraction_temp_c}°C) diversa dal preset (${statePreset.tempC}°C).`);
	if (effectiveAbvPercent !== null && effectiveAbvPercent < 20) warnings.push(`⚠️ ABV stimata tintura ~${effectiveAbvPercent}%. Sotto 20% rischio contaminazione.`);
	if (input.ingredient_sugar_percent && input.ingredient_sugar_percent > 5) warnings.push(`⚠️ ~${input.ingredient_sugar_percent}% zuccheri → possibile rifermentazione.`);
	if (targetAbv > 80) warnings.push("⚠️ ABV > 80%: estrazione molto aggressiva.");
	if (input.category === "hop") warnings.push("⚠️ Tintura luppolo NON sostituisce dry hopping.");
	if (extractionDays && extractionDays > 14 && [
		"seed_spice",
		"fresh_herb",
		"citrus_peel",
		"chili"
	].includes(input.category)) warnings.push("⚠️ Estrazione >14gg: rischio tannino, amaro, note medicinali.");
	if (input.category === "other" && !input.food_safe_confirmed) warnings.push("🚫 Categoria \"other\" senza food_safe_confirmed.");
	return {
		mode: "plan",
		ingredient: input.ingredient,
		category: input.category,
		categoryLabel: preset.label,
		tinctureAbvPercent: effectiveAbvPercent ?? targetAbv,
		alcohol95Ml: alcoholMl,
		waterMl,
		solventVolumeMl: solventMl,
		ingredientWeightG: input.ingredient_weight_g,
		ingredientToSolventRatio: ratioLabel,
		extractionTime,
		extractionTempC: tempC,
		extractionMinHours: minHours,
		extractionMaxHours: maxHours,
		preparation,
		agitation,
		filtration,
		benchTrial: {
			doseLowMlPer100ml: doseLow,
			doseMidMlPer100ml: doseMid,
			doseHighMlPer100ml: doseHigh,
			samples: [
				{
					sample: "A — Controllo",
					doseMlPer100: 0,
					doseMlActual: 0
				},
				{
					sample: "B — Minima",
					doseMlPer100: doseLow,
					doseMlActual: scaleDose(doseLow)
				},
				{
					sample: "C — Bassa",
					doseMlPer100: doseMid,
					doseMlActual: scaleDose(doseMid)
				},
				{
					sample: "D — Media",
					doseMlPer100: doseHigh,
					doseMlActual: scaleDose(doseHigh)
				},
				{
					sample: "E — Alta",
					doseMlPer100: doseHigh * 2,
					doseMlActual: scaleDose(doseHigh * 2)
				}
			],
			sampleMl
		},
		estimatedBatchDoseMl: null,
		alcoholContributionAbv: null,
		hasFermentables: preset.hasFermentables || (input.ingredient_sugar_percent ?? 0) > 5,
		recoveredMl: Math.round(solventMl * defaultRecFrac),
		recoveryFraction: defaultRecFrac,
		recoveryIsMeasured: false,
		warnings
	};
}
function doseTincture(input) {
	const preset = CATEGORY_PRESETS[input.category] ?? CATEGORY_PRESETS["other"];
	const tinctureAbv = input.tincture_abv_percent ?? 50;
	const sampleMl = input.test_sample_ml;
	const batchVolumeMl = input.beer_volume_l * 1e3;
	const estimatedBatchDoseMl = Math.round(input.test_dose_ml * batchVolumeMl / sampleMl * 100) / 100;
	const beerMl = input.beer_volume_l * 1e3;
	const alcoholContributionAbv = Math.round(estimatedBatchDoseMl * (tinctureAbv / 100) / (beerMl + estimatedBatchDoseMl) * 100 * 100) / 100;
	const recoveryIsMeasured = input.recovered_tincture_volume_ml !== void 0;
	const recoveredMl = input.recovered_tincture_volume_ml ?? null;
	const recoveryFraction = null;
	const warnings = getSafetyWarnings(input.ingredient, input.category);
	if (input.ingredient_sugar_percent && input.ingredient_sugar_percent > 5) warnings.push(`⚠️ ~${input.ingredient_sugar_percent}% zuccheri → possibile rifermentazione.`);
	if (input.category === "hop") warnings.push("⚠️ Tintura luppolo NON sostituisce dry hopping.");
	if (alcoholContributionAbv > .5) warnings.push(`⚠️ Contributo alcolico significativo: +${alcoholContributionAbv}% ABV.`);
	const doseMlActual = input.test_dose_ml;
	const doseMlPer100 = Math.round(input.test_dose_ml * 100 / sampleMl * 1e3) / 1e3;
	return {
		mode: "dose",
		ingredient: input.ingredient,
		category: input.category,
		categoryLabel: preset?.label ?? "Sconosciuta",
		tinctureAbvPercent: tinctureAbv,
		alcohol95Ml: 0,
		waterMl: 0,
		solventVolumeMl: 0,
		ingredientWeightG: 0,
		ingredientToSolventRatio: "N/D",
		extractionTime: "N/D",
		extractionTempC: 0,
		extractionMinHours: 0,
		extractionMaxHours: 0,
		preparation: [],
		agitation: "",
		filtration: [],
		benchTrial: {
			doseLowMlPer100ml: 0,
			doseMidMlPer100ml: 0,
			doseHighMlPer100ml: 0,
			samples: [{
				sample: "A — Controllo",
				doseMlPer100: 0,
				doseMlActual: 0
			}, {
				sample: "B — Scelta",
				doseMlPer100,
				doseMlActual
			}],
			sampleMl
		},
		estimatedBatchDoseMl,
		alcoholContributionAbv,
		hasFermentables: (input.ingredient_sugar_percent ?? 0) > 5,
		recoveredMl,
		recoveryFraction,
		recoveryIsMeasured,
		warnings
	};
}
function compute(input) {
	return input.mode === "plan" ? planTincture(input) : doseTincture(input);
}
function formatResults(input) {
	const lines = [];
	const plan = compute(input);
	const stateLabel = {
		fresh: "Fresco",
		dried: "Essiccato",
		pellet: "Pellet",
		whole: "Intero",
		ground: "Macinato",
		crushed: "Schiacciato",
		chips: "Chips",
		cubes: "Cubetti"
	};
	if (plan.mode === "dose") {
		lines.push(`# 🧪 Tintura Alcolica: ${plan.ingredient} — DOSE BATCH`);
		lines.push("");
	} else {
		lines.push(`# 🧪 Tintura Alcolica: ${plan.ingredient}`);
		lines.push("");
	}
	if (plan.warnings.length > 0) {
		lines.push("## ⚠️ Avvertenze");
		lines.push("");
		for (const w of plan.warnings) lines.push(`- ${w}`);
		lines.push("");
	}
	if (plan.mode === "plan") {
		lines.push("## 📊 Parametri della tintura");
		lines.push("");
		lines.push("| Parametro | Valore |");
		lines.push("|---|---|");
		lines.push(`| Ingrediente | **${plan.ingredient}** |`);
		lines.push(`| Categoria | ${plan.categoryLabel} |`);
		const istate = input.ingredient_state;
		lines.push(`| Stato | ${stateLabel[istate] ?? istate} |`);
		lines.push(`| Peso ingrediente | **${plan.ingredientWeightG} g** |`);
		lines.push(`| ABV target | **${plan.tinctureAbvPercent}%** |`);
		lines.push(`| Volume solvente | **${plan.solventVolumeMl} mL** |`);
		lines.push(`| Rapporto | ${plan.ingredientToSolventRatio} |`);
		lines.push(`| Tempo estrazione | ${plan.extractionTime} |`);
		lines.push(`| Temperatura | ${plan.extractionTempC} °C |`);
		lines.push("");
		const pin = input;
		lines.push("## 🧫 Ricetta del solvente");
		lines.push("");
		lines.push(`Per ottenere **${plan.solventVolumeMl} mL** al **${plan.tinctureAbvPercent}%** partendo da alcol a **${pin.source_abv_percent}°**:`);
		lines.push("");
		lines.push("| Componente | Quantità |");
		lines.push("|---|---|");
		lines.push(`| Alcol ${pin.source_abv_percent}° | **${plan.alcohol95Ml} mL** |`);
		lines.push(`| Acqua demineralizzata | **${plan.waterMl} mL** |`);
		lines.push(`| Volume finale | **${plan.solventVolumeMl} mL** |`);
		lines.push("");
		lines.push("> Versare PRIMA l'alcol, POI l'acqua, quindi portare a volume. I volumi acqua–etanolo non sono perfettamente additivi.");
		if (pin.ingredient_water_percent && pin.ingredient_water_percent > 0) lines.push(`> ⚠️ ABV stimata della tintura dopo l'ingrediente: **~${plan.tinctureAbvPercent}%** (diluizione da acqua dell'ingrediente — stima semplificata, non sostituisce una misura alcolometrica).`);
		lines.push("");
		lines.push("## 🔧 Preparazione");
		lines.push("");
		for (let i = 0; i < plan.preparation.length; i++) lines.push(`${i + 1}. ${plan.preparation[i]}`);
		lines.push("");
		lines.push("## 🔄 Agitazione");
		lines.push("");
		lines.push(plan.agitation);
		lines.push("");
		lines.push("## 🫗 Filtrazione");
		lines.push("");
		for (let i = 0; i < plan.filtration.length; i++) lines.push(`${i + 1}. ${plan.filtration[i]}`);
		lines.push("");
		lines.push("## 🧪 Bench Trial (OBBLIGATORIO)");
		lines.push("");
		lines.push("Preparare 5 campioni da **100 mL** di birra finita:");
		lines.push("");
		lines.push("| Campione | Dose (mL/campione) |");
		lines.push("|---|---|");
		for (const s of plan.benchTrial.samples) lines.push(`| ${s.sample} | ${s.doseMlActual > 0 ? s.doseMlActual.toFixed(3) : "0"} |`);
		lines.push("");
		lines.push("Mescolare, attendere 10–30 minuti, assaggiare alla temperatura di servizio.");
		lines.push("- Per legno: attendere almeno 15–30 min nel campione prima di giudicare.");
		if (plan.category === "chili") lines.push("- Per peperoncino: iniziare da 1 goccia. Dosi <0.05 mL richiedono micropipetta o diluizione seriale (1:10).");
		lines.push("");
		if (plan.recoveryIsMeasured) lines.push(`*Volume recuperato misurato: **${plan.recoveredMl} mL** (${Math.round((plan.recoveryFraction ?? 0) * 100)}% del solvente).*`);
		else lines.push(`*Volume recuperato stimato: ~**${plan.recoveredMl} mL** (${Math.round((plan.recoveryFraction ?? 0) * 100)}% del solvente). Misurare il volume effettivo e usare mode:"dose" con recovered_tincture_volume_ml.*`);
		lines.push("");
		if (input.show_details) {
			lines.push("## 📝 Note specifiche");
			lines.push("");
			const presetKey = plan.category === "hop" && input.hop_variant === "cold_short" ? "hop_cold_short" : plan.category;
			lines.push(CATEGORY_PRESETS[presetKey]?.notes ?? CATEGORY_PRESETS["other"].notes);
			lines.push("");
		}
	}
	if (plan.estimatedBatchDoseMl !== null && plan.alcoholContributionAbv !== null) {
		lines.push("## 📐 Dose per il batch");
		lines.push("");
		const doseIn = input;
		lines.push(`Dose campione: **${doseIn.test_dose_ml} mL** in **${doseIn.test_sample_ml} mL** →`);
		lines.push("");
		lines.push("| Parametro | Valore |");
		lines.push("|---|---|");
		lines.push(`| Volume birra (effettivo) | **${doseIn.beer_volume_l} L** |`);
		lines.push(`| ABV tintura | **${plan.tinctureAbvPercent}%** |`);
		lines.push(`| Dose batch calcolata | **${plan.estimatedBatchDoseMl} mL** |`);
		lines.push(`| Dose consigliata (75%) | **${Math.round(plan.estimatedBatchDoseMl * .75 * 100) / 100} mL** |`);
		lines.push(`| Contributo ABV | **+${plan.alcoholContributionAbv}%** |`);
		lines.push("");
		if (plan.alcoholContributionAbv > .5) lines.push(`> ⚠️ Contributo alcolico significativo (+${plan.alcoholContributionAbv}% ABV).`);
		if (plan.hasFermentables) lines.push("> ⚠️ Zuccheri fermentabili. Aggiungere solo a birra stabilizzata o in keg freddo.");
		lines.push("");
		lines.push("**Procedura:**");
		lines.push(`1. Aggiungere il 75% (~${Math.round(plan.estimatedBatchDoseMl * .75 * 100) / 100} mL).`);
		lines.push("2. Miscelare delicatamente. In keg: closed transfer. In bottiglia: al bottling bucket con priming.");
		lines.push("3. Assaggiare dopo 12–24 ore.");
		lines.push("4. Correggere con la parte restante SOLO SE necessaria.");
		lines.push("");
	}
	lines.push("## 🛡️ Checklist di sicurezza");
	lines.push("");
	lines.push("- [ ] Alcol alimentare NON denaturato");
	lines.push("- [ ] Acqua demineralizzata, osmotizzata o bollita e raffreddata");
	lines.push("- [ ] Contenitore in VETRO sanificato");
	lines.push("- [ ] Tappo resistente all'alcol");
	lines.push("- [ ] Conservazione al BUIO");
	lines.push("- [ ] Ingrediente certificato per uso alimentare");
	lines.push("- [ ] NESSUNA fiamma, fornello o piastra vicino all'alcol concentrato");
	lines.push("- [ ] Bench trial completato PRIMA di dosare il batch");
	lines.push("");
	return lines.join("\n");
}
var TinctureCalculatorTool = class {
	name = "tincture_calculator";
	description = [
		"Pianifica una tintura alcolica per birra: calcola la ricetta del solvente (alcol 95° + acqua → ABV target), proporzioni, tempo e temperatura di estrazione, procedura di preparazione e filtrazione, protocollo di bench trial, dose per il batch e contributo alcolico.",
		"",
		"⚠️ REGOLE FONDAMENTALI:",
		"- Il bench trial è OBBLIGATORIO prima di dosare il batch. Fornisci sempre test_sample_ml e test_dose_ml.",
		"- Una tintura di luppolo NON sostituisce il dry hopping: è uno strumento correttivo/sperimentale.",
		"- Usare SOLO alcol alimentare non denaturato, acqua demineralizzata, contenitori in vetro.",
		"- Mai riscaldare alcol 95° direttamente: estremamente infiammabile.",
		"- Legno: solo certificato alimentare, mai da falegnameria.",
		"- Il tool applica automaticamente avvertenze di sicurezza per ingredienti a rischio.",
		"",
		"Categorie supportate: hop, wood, seed_spice, bark_root, fresh_herb, dried_herb, citrus_peel, chili, coffee, cacao, vanilla, fruit, other."
	].join("\n");
	parameters = toInputJsonSchema(TinctureCalculatorInputSchema);
	resolveExecution(rawArgs) {
		const args = TinctureCalculatorInputSchema.parse(rawArgs);
		const abvDesc = args.mode === "plan" ? args.target_abv_percent ?? "auto" : args.tincture_abv_percent ?? "auto";
		return {
			description: `Tintura: ${args.ingredient} (${args.category}) @ ${abvDesc}%`,
			approvalRule: this.name,
			execute: () => {
				try {
					return Promise.resolve({ output: formatResults(args) });
				} catch (e) {
					return Promise.resolve({
						isError: true,
						output: e instanceof Error ? e.message : String(e)
					});
				}
			}
		};
	}
};
registerTool(TinctureCalculatorTool);

//#endregion
//#region src/brewing/yaml-validator.ts
/**
* YAML recipe validator — reads a beer recipe YAML, validates it against
* BJCP style guidelines with deterministic checks, then produces an LLM
* review prompt with full context for deep qualitative analysis.
*/
const YamlValidatorInputSchema = object({ input_file: string().describe("Path to the recipe YAML file.") });
const BJCP = {
	"1A": {
		code: "1A",
		category: "1",
		name: "American Light Lager",
		og_min: 1.028,
		og_max: 1.04,
		fg_min: .998,
		fg_max: 1.008,
		abv_min: 2.8,
		abv_max: 4.2,
		ibu_min: 8,
		ibu_max: 12,
		ebc_min: 4,
		ebc_max: 6
	},
	"1B": {
		code: "1B",
		category: "1",
		name: "American Lager",
		og_min: 1.04,
		og_max: 1.05,
		fg_min: 1.004,
		fg_max: 1.01,
		abv_min: 4.2,
		abv_max: 5.3,
		ibu_min: 8,
		ibu_max: 18,
		ebc_min: 4,
		ebc_max: 8
	},
	"1C": {
		code: "1C",
		category: "1",
		name: "Cream Ale",
		og_min: 1.042,
		og_max: 1.055,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 4.2,
		abv_max: 5.6,
		ibu_min: 8,
		ibu_max: 20,
		ebc_min: 4,
		ebc_max: 10
	},
	"1D": {
		code: "1D",
		category: "1",
		name: "American Wheat Beer",
		og_min: 1.04,
		og_max: 1.055,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4,
		abv_max: 5.5,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 6,
		ebc_max: 12
	},
	"2A": {
		code: "2A",
		category: "2",
		name: "International Pale Lager",
		og_min: 1.042,
		og_max: 1.05,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.6,
		abv_max: 6,
		ibu_min: 18,
		ibu_max: 25,
		ebc_min: 4,
		ebc_max: 10
	},
	"2B": {
		code: "2B",
		category: "2",
		name: "International Amber Lager",
		og_min: 1.042,
		og_max: 1.055,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4.6,
		abv_max: 6,
		ibu_min: 8,
		ibu_max: 25,
		ebc_min: 14,
		ebc_max: 34
	},
	"2C": {
		code: "2C",
		category: "2",
		name: "International Dark Lager",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 8,
		ibu_max: 20,
		ebc_min: 28,
		ebc_max: 50
	},
	"3A": {
		code: "3A",
		category: "3",
		name: "Czech Pale Lager",
		og_min: 1.028,
		og_max: 1.044,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 3,
		abv_max: 4,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 14
	},
	"3B": {
		code: "3B",
		category: "3",
		name: "Czech Premium Pale Lager",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.2,
		abv_max: 5.8,
		ibu_min: 30,
		ibu_max: 45,
		ebc_min: 6,
		ebc_max: 14
	},
	"3C": {
		code: "3C",
		category: "3",
		name: "Czech Amber Lager",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.4,
		abv_max: 5.8,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 20,
		ebc_max: 40
	},
	"3D": {
		code: "3D",
		category: "3",
		name: "Czech Dark Lager",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.013,
		fg_max: 1.017,
		abv_min: 4.4,
		abv_max: 5.8,
		ibu_min: 18,
		ibu_max: 34,
		ebc_min: 34,
		ebc_max: 70
	},
	"4A": {
		code: "4A",
		category: "4",
		name: "Munich Helles",
		og_min: 1.044,
		og_max: 1.048,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 4.7,
		abv_max: 5.4,
		ibu_min: 16,
		ibu_max: 22,
		ebc_min: 6,
		ebc_max: 10
	},
	"4B": {
		code: "4B",
		category: "4",
		name: "Festbier",
		og_min: 1.054,
		og_max: 1.058,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.8,
		abv_max: 6.3,
		ibu_min: 18,
		ibu_max: 25,
		ebc_min: 8,
		ebc_max: 14
	},
	"4C": {
		code: "4C",
		category: "4",
		name: "Helles Bock",
		og_min: 1.064,
		og_max: 1.072,
		fg_min: 1.011,
		fg_max: 1.018,
		abv_min: 6.3,
		abv_max: 7.4,
		ibu_min: 23,
		ibu_max: 35,
		ebc_min: 12,
		ebc_max: 20
	},
	"5A": {
		code: "5A",
		category: "5",
		name: "German Leichtbier",
		og_min: 1.026,
		og_max: 1.034,
		fg_min: 1.006,
		fg_max: 1.01,
		abv_min: 2.4,
		abv_max: 3.6,
		ibu_min: 15,
		ibu_max: 28,
		ebc_min: 4,
		ebc_max: 8
	},
	"5B": {
		code: "5B",
		category: "5",
		name: "Kölsch",
		og_min: 1.044,
		og_max: 1.05,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 4.4,
		abv_max: 5.2,
		ibu_min: 18,
		ibu_max: 30,
		ebc_min: 7,
		ebc_max: 10
	},
	"5C": {
		code: "5C",
		category: "5",
		name: "German Helles Exportbier",
		og_min: 1.048,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 8,
		ebc_max: 12
	},
	"5D": {
		code: "5D",
		category: "5",
		name: "German Pils",
		og_min: 1.044,
		og_max: 1.05,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.4,
		abv_max: 5.2,
		ibu_min: 22,
		ibu_max: 40,
		ebc_min: 4,
		ebc_max: 8
	},
	"6A": {
		code: "6A",
		category: "6",
		name: "Märzen",
		og_min: 1.054,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.8,
		abv_max: 6.3,
		ibu_min: 18,
		ibu_max: 24,
		ebc_min: 16,
		ebc_max: 30
	},
	"6B": {
		code: "6B",
		category: "6",
		name: "Rauchbier",
		og_min: 1.05,
		og_max: 1.057,
		fg_min: 1.012,
		fg_max: 1.016,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 44
	},
	"6C": {
		code: "6C",
		category: "6",
		name: "Dunkels Bock",
		og_min: 1.064,
		og_max: 1.072,
		fg_min: 1.013,
		fg_max: 1.019,
		abv_min: 6.3,
		abv_max: 7.2,
		ibu_min: 20,
		ibu_max: 27,
		ebc_min: 28,
		ebc_max: 44
	},
	"7A": {
		code: "7A",
		category: "7",
		name: "Vienna Lager",
		og_min: 1.048,
		og_max: 1.055,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.7,
		abv_max: 5.5,
		ibu_min: 18,
		ibu_max: 30,
		ebc_min: 18,
		ebc_max: 30
	},
	"7B": {
		code: "7B",
		category: "7",
		name: "Altbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.5,
		ibu_min: 25,
		ibu_max: 50,
		ebc_min: 22,
		ebc_max: 34
	},
	"7C": {
		code: "7C",
		category: "7",
		name: "Kellerbier",
		og_min: 1.045,
		og_max: 1.051,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.7,
		abv_max: 5.4,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 20
	},
	"8A": {
		code: "8A",
		category: "8",
		name: "Munich Dunkel",
		og_min: 1.048,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.5,
		abv_max: 5.6,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 28,
		ebc_max: 46
	},
	"8B": {
		code: "8B",
		category: "8",
		name: "Schwarzbier",
		og_min: 1.046,
		og_max: 1.052,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.4,
		abv_max: 5.4,
		ibu_min: 22,
		ibu_max: 30,
		ebc_min: 34,
		ebc_max: 62
	},
	"9A": {
		code: "9A",
		category: "9",
		name: "Doppelbock",
		og_min: 1.072,
		og_max: 1.112,
		fg_min: 1.016,
		fg_max: 1.024,
		abv_min: 7,
		abv_max: 10,
		ibu_min: 16,
		ibu_max: 26,
		ebc_min: 24,
		ebc_max: 45
	},
	"9B": {
		code: "9B",
		category: "9",
		name: "Eisbock",
		og_min: 1.078,
		og_max: 1.12,
		fg_min: 1.02,
		fg_max: 1.035,
		abv_min: 9,
		abv_max: 14,
		ibu_min: 25,
		ibu_max: 35,
		ebc_min: 36,
		ebc_max: 68
	},
	"9C": {
		code: "9C",
		category: "9",
		name: "Baltic Porter",
		og_min: 1.06,
		og_max: 1.09,
		fg_min: 1.016,
		fg_max: 1.024,
		abv_min: 6.5,
		abv_max: 9.5,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 34,
		ebc_max: 60
	},
	"10A": {
		code: "10A",
		category: "10",
		name: "Weissbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.6,
		ibu_min: 8,
		ibu_max: 15,
		ebc_min: 4,
		ebc_max: 14
	},
	"10B": {
		code: "10B",
		category: "10",
		name: "Dunkles Weissbier",
		og_min: 1.044,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.3,
		abv_max: 5.6,
		ibu_min: 10,
		ibu_max: 18,
		ebc_min: 28,
		ebc_max: 46
	},
	"10C": {
		code: "10C",
		category: "10",
		name: "Weizenbock",
		og_min: 1.064,
		og_max: 1.09,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 6.5,
		abv_max: 9,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 12,
		ebc_max: 44
	},
	"11A": {
		code: "11A",
		category: "11",
		name: "Ordinary Bitter",
		og_min: 1.03,
		og_max: 1.039,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 3.2,
		abv_max: 3.8,
		ibu_min: 25,
		ibu_max: 35,
		ebc_min: 16,
		ebc_max: 28
	},
	"11B": {
		code: "11B",
		category: "11",
		name: "Best Bitter",
		og_min: 1.04,
		og_max: 1.048,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 3.8,
		abv_max: 4.6,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 16,
		ebc_max: 28
	},
	"11C": {
		code: "11C",
		category: "11",
		name: "Strong Bitter",
		og_min: 1.048,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.6,
		abv_max: 6.2,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 18,
		ebc_max: 40
	},
	"12A": {
		code: "12A",
		category: "12",
		name: "British Golden Ale",
		og_min: 1.038,
		og_max: 1.053,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 3.8,
		abv_max: 5,
		ibu_min: 20,
		ibu_max: 45,
		ebc_min: 4,
		ebc_max: 12
	},
	"12B": {
		code: "12B",
		category: "12",
		name: "Australian Sparkling Ale",
		og_min: 1.038,
		og_max: 1.05,
		fg_min: 1.004,
		fg_max: 1.006,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 4,
		ebc_max: 14
	},
	"12C": {
		code: "12C",
		category: "12",
		name: "English IPA",
		og_min: 1.05,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 5,
		abv_max: 7.5,
		ibu_min: 40,
		ibu_max: 60,
		ebc_min: 12,
		ebc_max: 30
	},
	"13A": {
		code: "13A",
		category: "13",
		name: "Dark Mild",
		og_min: 1.03,
		og_max: 1.038,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 3,
		abv_max: 3.8,
		ibu_min: 10,
		ibu_max: 25,
		ebc_min: 24,
		ebc_max: 44
	},
	"13B": {
		code: "13B",
		category: "13",
		name: "British Brown Ale",
		og_min: 1.04,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 4.2,
		abv_max: 5.9,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 44
	},
	"13C": {
		code: "13C",
		category: "13",
		name: "English Porter",
		og_min: 1.04,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 4,
		abv_max: 5.4,
		ibu_min: 18,
		ibu_max: 35,
		ebc_min: 40,
		ebc_max: 60
	},
	"14A": {
		code: "14A",
		category: "14",
		name: "Scottish Light",
		og_min: 1.03,
		og_max: 1.035,
		fg_min: 1.01,
		fg_max: 1.013,
		abv_min: 2.5,
		abv_max: 3.2,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 30,
		ebc_max: 50
	},
	"14B": {
		code: "14B",
		category: "14",
		name: "Scottish Heavy",
		og_min: 1.035,
		og_max: 1.04,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 3.2,
		abv_max: 3.9,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 24,
		ebc_max: 40
	},
	"14C": {
		code: "14C",
		category: "14",
		name: "Scottish Export",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 3.9,
		abv_max: 6,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 24,
		ebc_max: 40
	},
	"15A": {
		code: "15A",
		category: "15",
		name: "Irish Red Ale",
		og_min: 1.036,
		og_max: 1.046,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 3.8,
		abv_max: 5,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 18,
		ebc_max: 36
	},
	"15B": {
		code: "15B",
		category: "15",
		name: "Irish Stout",
		og_min: 1.036,
		og_max: 1.044,
		fg_min: 1.007,
		fg_max: 1.011,
		abv_min: 4,
		abv_max: 4.5,
		ibu_min: 25,
		ibu_max: 45,
		ebc_min: 50,
		ebc_max: 80
	},
	"15C": {
		code: "15C",
		category: "15",
		name: "Irish Extra Stout",
		og_min: 1.052,
		og_max: 1.062,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 5.5,
		abv_max: 6.5,
		ibu_min: 35,
		ibu_max: 50,
		ebc_min: 60,
		ebc_max: 80
	},
	"16A": {
		code: "16A",
		category: "16",
		name: "Sweet Stout",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.012,
		fg_max: 1.024,
		abv_min: 4,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 60,
		ebc_max: 100
	},
	"16B": {
		code: "16B",
		category: "16",
		name: "Oatmeal Stout",
		og_min: 1.045,
		og_max: 1.065,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 4.2,
		abv_max: 5.9,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 40,
		ebc_max: 80
	},
	"16C": {
		code: "16C",
		category: "16",
		name: "Tropical Stout",
		og_min: 1.056,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 5.5,
		abv_max: 8,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 60,
		ebc_max: 100
	},
	"16D": {
		code: "16D",
		category: "16",
		name: "Foreign Extra Stout",
		og_min: 1.056,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 6.3,
		abv_max: 8,
		ibu_min: 50,
		ibu_max: 70,
		ebc_min: 60,
		ebc_max: 100
	},
	"17A": {
		code: "17A",
		category: "17",
		name: "British Strong Ale",
		og_min: 1.055,
		og_max: 1.08,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 5.5,
		abv_max: 8,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 16,
		ebc_max: 44
	},
	"17B": {
		code: "17B",
		category: "17",
		name: "Old Ale",
		og_min: 1.055,
		og_max: 1.088,
		fg_min: 1.015,
		fg_max: 1.022,
		abv_min: 5.5,
		abv_max: 9,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 24,
		ebc_max: 44
	},
	"17C": {
		code: "17C",
		category: "17",
		name: "Wee Heavy",
		og_min: 1.07,
		og_max: 1.13,
		fg_min: 1.018,
		fg_max: 1.04,
		abv_min: 6.5,
		abv_max: 10,
		ibu_min: 17,
		ibu_max: 35,
		ebc_min: 28,
		ebc_max: 60
	},
	"17D": {
		code: "17D",
		category: "17",
		name: "English Barley Wine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.018,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 35,
		ibu_max: 70,
		ebc_min: 20,
		ebc_max: 44
	},
	"18A": {
		code: "18A",
		category: "18",
		name: "Blonde Ale",
		og_min: 1.038,
		og_max: 1.054,
		fg_min: 1.008,
		fg_max: 1.013,
		abv_min: 3.8,
		abv_max: 5.5,
		ibu_min: 15,
		ibu_max: 28,
		ebc_min: 6,
		ebc_max: 14
	},
	"18B": {
		code: "18B",
		category: "18",
		name: "American Pale Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.5,
		abv_max: 6.2,
		ibu_min: 30,
		ibu_max: 50,
		ebc_min: 10,
		ebc_max: 20
	},
	"19A": {
		code: "19A",
		category: "19",
		name: "American Amber Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.5,
		abv_max: 6.2,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 20,
		ebc_max: 34
	},
	"19B": {
		code: "19B",
		category: "19",
		name: "California Common",
		og_min: 1.048,
		og_max: 1.054,
		fg_min: 1.011,
		fg_max: 1.014,
		abv_min: 4.5,
		abv_max: 5.5,
		ibu_min: 30,
		ibu_max: 45,
		ebc_min: 20,
		ebc_max: 28
	},
	"19C": {
		code: "19C",
		category: "19",
		name: "American Brown Ale",
		og_min: 1.045,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.3,
		abv_max: 6.2,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 36,
		ebc_max: 60
	},
	"20A": {
		code: "20A",
		category: "20",
		name: "American Porter",
		og_min: 1.05,
		og_max: 1.07,
		fg_min: 1.012,
		fg_max: 1.018,
		abv_min: 4.8,
		abv_max: 6.5,
		ibu_min: 25,
		ibu_max: 50,
		ebc_min: 40,
		ebc_max: 80
	},
	"20B": {
		code: "20B",
		category: "20",
		name: "American Stout",
		og_min: 1.05,
		og_max: 1.075,
		fg_min: 1.01,
		fg_max: 1.022,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 35,
		ibu_max: 75,
		ebc_min: 60,
		ebc_max: 100
	},
	"20C": {
		code: "20C",
		category: "20",
		name: "Imperial Stout",
		og_min: 1.075,
		og_max: 1.115,
		fg_min: 1.018,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 50,
		ibu_max: 90,
		ebc_min: 60,
		ebc_max: 100
	},
	"21A": {
		code: "21A",
		category: "21",
		name: "American IPA",
		og_min: 1.056,
		og_max: 1.07,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 5.5,
		abv_max: 7.5,
		ibu_min: 40,
		ibu_max: 70,
		ebc_min: 12,
		ebc_max: 28
	},
	"21B": {
		code: "21B",
		category: "21",
		name: "Specialty IPA",
		og_min: 1.05,
		og_max: 1.085,
		fg_min: 1.008,
		fg_max: 1.02,
		abv_min: 5,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 100,
		ebc_min: 6,
		ebc_max: 80
	},
	"21B1": {
		code: "21B1",
		category: "21",
		name: "New England IPA",
		og_min: 1.06,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 6,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 60,
		ebc_min: 6,
		ebc_max: 16
	},
	"21C": {
		code: "21C",
		category: "21",
		name: "Hazy IPA",
		og_min: 1.06,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 6,
		abv_max: 9,
		ibu_min: 25,
		ibu_max: 60,
		ebc_min: 6,
		ebc_max: 16
	},
	"22A": {
		code: "22A",
		category: "22",
		name: "Double IPA",
		og_min: 1.065,
		og_max: 1.085,
		fg_min: 1.01,
		fg_max: 1.02,
		abv_min: 7.5,
		abv_max: 10,
		ibu_min: 60,
		ibu_max: 120,
		ebc_min: 12,
		ebc_max: 30
	},
	"22B": {
		code: "22B",
		category: "22",
		name: "American Strong Ale",
		og_min: 1.062,
		og_max: 1.09,
		fg_min: 1.014,
		fg_max: 1.024,
		abv_min: 6.3,
		abv_max: 10,
		ibu_min: 50,
		ibu_max: 100,
		ebc_min: 14,
		ebc_max: 44
	},
	"22C": {
		code: "22C",
		category: "22",
		name: "American Barleywine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.016,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 50,
		ibu_max: 100,
		ebc_min: 20,
		ebc_max: 40
	},
	"22D": {
		code: "22D",
		category: "22",
		name: "Wheatwine",
		og_min: 1.08,
		og_max: 1.12,
		fg_min: 1.016,
		fg_max: 1.03,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 30,
		ibu_max: 60,
		ebc_min: 16,
		ebc_max: 30
	},
	"23A": {
		code: "23A",
		category: "23",
		name: "Berliner Weisse",
		og_min: 1.028,
		og_max: 1.032,
		fg_min: 1.003,
		fg_max: 1.006,
		abv_min: 2.8,
		abv_max: 3.8,
		ibu_min: 3,
		ibu_max: 8,
		ebc_min: 4,
		ebc_max: 6
	},
	"23B": {
		code: "23B",
		category: "23",
		name: "Flanders Red Ale",
		og_min: 1.048,
		og_max: 1.057,
		fg_min: 1.002,
		fg_max: 1.012,
		abv_min: 4.6,
		abv_max: 6.5,
		ibu_min: 10,
		ibu_max: 25,
		ebc_min: 20,
		ebc_max: 34
	},
	"23C": {
		code: "23C",
		category: "23",
		name: "Oud Bruin",
		og_min: 1.04,
		og_max: 1.074,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4,
		abv_max: 8,
		ibu_min: 20,
		ibu_max: 25,
		ebc_min: 30,
		ebc_max: 44
	},
	"23D": {
		code: "23D",
		category: "23",
		name: "Lambic",
		og_min: 1.04,
		og_max: 1.054,
		fg_min: 1.001,
		fg_max: 1.01,
		abv_min: 5,
		abv_max: 6.5,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23E": {
		code: "23E",
		category: "23",
		name: "Gueuze",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1,
		fg_max: 1.006,
		abv_min: 5,
		abv_max: 8,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23F": {
		code: "23F",
		category: "23",
		name: "Fruit Lambic",
		og_min: 1.04,
		og_max: 1.06,
		fg_min: 1,
		fg_max: 1.01,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 0,
		ibu_max: 10,
		ebc_min: 6,
		ebc_max: 26
	},
	"23G": {
		code: "23G",
		category: "23",
		name: "Gose",
		og_min: 1.036,
		og_max: 1.056,
		fg_min: 1.006,
		fg_max: 1.01,
		abv_min: 4.2,
		abv_max: 4.8,
		ibu_min: 5,
		ibu_max: 12,
		ebc_min: 6,
		ebc_max: 12
	},
	"24A": {
		code: "24A",
		category: "24",
		name: "Witbier",
		og_min: 1.044,
		og_max: 1.052,
		fg_min: 1.008,
		fg_max: 1.012,
		abv_min: 4.5,
		abv_max: 5.5,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 4,
		ebc_max: 8
	},
	"24B": {
		code: "24B",
		category: "24",
		name: "Belgian Pale Ale",
		og_min: 1.048,
		og_max: 1.054,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.8,
		abv_max: 5.5,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 16,
		ebc_max: 28
	},
	"24C": {
		code: "24C",
		category: "24",
		name: "Bière de Garde",
		og_min: 1.06,
		og_max: 1.08,
		fg_min: 1.008,
		fg_max: 1.016,
		abv_min: 6,
		abv_max: 8.5,
		ibu_min: 18,
		ibu_max: 28,
		ebc_min: 12,
		ebc_max: 38
	},
	"25A": {
		code: "25A",
		category: "25",
		name: "Belgian Blond Ale",
		og_min: 1.062,
		og_max: 1.075,
		fg_min: 1.008,
		fg_max: 1.018,
		abv_min: 6,
		abv_max: 7.5,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 8,
		ebc_max: 14
	},
	"25B": {
		code: "25B",
		category: "25",
		name: "Saison",
		og_min: 1.048,
		og_max: 1.065,
		fg_min: 1.002,
		fg_max: 1.008,
		abv_min: 5,
		abv_max: 7,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 10,
		ebc_max: 20
	},
	"25C": {
		code: "25C",
		category: "25",
		name: "Belgian Golden Strong Ale",
		og_min: 1.07,
		og_max: 1.095,
		fg_min: 1.005,
		fg_max: 1.016,
		abv_min: 7.5,
		abv_max: 10.5,
		ibu_min: 22,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 10
	},
	"26A": {
		code: "26A",
		category: "26",
		name: "Trappist Single",
		og_min: 1.044,
		og_max: 1.054,
		fg_min: 1.004,
		fg_max: 1.01,
		abv_min: 4.8,
		abv_max: 6,
		ibu_min: 25,
		ibu_max: 45,
		ebc_min: 6,
		ebc_max: 10
	},
	"26B": {
		code: "26B",
		category: "26",
		name: "Belgian Dubbel",
		og_min: 1.062,
		og_max: 1.075,
		fg_min: 1.008,
		fg_max: 1.018,
		abv_min: 6,
		abv_max: 7.6,
		ibu_min: 15,
		ibu_max: 25,
		ebc_min: 20,
		ebc_max: 34
	},
	"26C": {
		code: "26C",
		category: "26",
		name: "Belgian Tripel",
		og_min: 1.075,
		og_max: 1.085,
		fg_min: 1.008,
		fg_max: 1.014,
		abv_min: 7.5,
		abv_max: 9.5,
		ibu_min: 20,
		ibu_max: 40,
		ebc_min: 8,
		ebc_max: 14
	},
	"26D": {
		code: "26D",
		category: "26",
		name: "Belgian Dark Strong Ale",
		og_min: 1.075,
		og_max: 1.11,
		fg_min: 1.01,
		fg_max: 1.024,
		abv_min: 8,
		abv_max: 12,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 24,
		ebc_max: 45
	},
	"27A": {
		code: "27A",
		category: "27",
		name: "Grodziskie",
		og_min: 1.028,
		og_max: 1.032,
		fg_min: 1.006,
		fg_max: 1.012,
		abv_min: 2.5,
		abv_max: 3.3,
		ibu_min: 20,
		ibu_max: 35,
		ebc_min: 6,
		ebc_max: 12
	},
	"27B": {
		code: "27B",
		category: "27",
		name: "Lichtenhainer",
		og_min: 1.032,
		og_max: 1.04,
		fg_min: 1.004,
		fg_max: 1.008,
		abv_min: 3.5,
		abv_max: 4.7,
		ibu_min: 5,
		ibu_max: 12,
		ebc_min: 6,
		ebc_max: 12
	},
	"27C": {
		code: "27C",
		category: "27",
		name: "Roggenbier",
		og_min: 1.046,
		og_max: 1.056,
		fg_min: 1.01,
		fg_max: 1.014,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 10,
		ibu_max: 20,
		ebc_min: 24,
		ebc_max: 40
	},
	"27D": {
		code: "27D",
		category: "27",
		name: "Sahti",
		og_min: 1.076,
		og_max: 1.12,
		fg_min: 1.016,
		fg_max: 1.04,
		abv_min: 7,
		abv_max: 11,
		ibu_min: 0,
		ibu_max: 15,
		ebc_min: 8,
		ebc_max: 44
	},
	"27E": {
		code: "27E",
		category: "27",
		name: "Kentucky Common",
		og_min: 1.044,
		og_max: 1.055,
		fg_min: 1.01,
		fg_max: 1.018,
		abv_min: 4,
		abv_max: 5.5,
		ibu_min: 15,
		ibu_max: 30,
		ebc_min: 22,
		ebc_max: 50
	},
	"27F": {
		code: "27F",
		category: "27",
		name: "Pre-Prohibition Lager",
		og_min: 1.044,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.015,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 25,
		ibu_max: 40,
		ebc_min: 6,
		ebc_max: 12
	},
	"27G": {
		code: "27G",
		category: "27",
		name: "Pre-Prohibition Porter",
		og_min: 1.046,
		og_max: 1.06,
		fg_min: 1.01,
		fg_max: 1.016,
		abv_min: 4.5,
		abv_max: 6,
		ibu_min: 20,
		ibu_max: 30,
		ebc_min: 40,
		ebc_max: 80
	},
	"27H": {
		code: "27H",
		category: "27",
		name: "London Brown Ale",
		og_min: 1.033,
		og_max: 1.038,
		fg_min: 1.012,
		fg_max: 1.015,
		abv_min: 2.8,
		abv_max: 3.6,
		ibu_min: 15,
		ibu_max: 20,
		ebc_min: 44,
		ebc_max: 70
	},
	"28A": {
		code: "28A",
		category: "28",
		name: "Brett Beer",
		og_min: 1.03,
		og_max: 1.08,
		fg_min: 1,
		fg_max: 1.012,
		abv_min: 3,
		abv_max: 9,
		ibu_min: 0,
		ibu_max: 50,
		ebc_min: 4,
		ebc_max: 40
	},
	"28B": {
		code: "28B",
		category: "28",
		name: "Mixed Fermentation Sour Beer",
		og_min: 1.03,
		og_max: 1.08,
		fg_min: 1,
		fg_max: 1.012,
		abv_min: 3,
		abv_max: 9,
		ibu_min: 0,
		ibu_max: 30,
		ebc_min: 4,
		ebc_max: 40
	},
	"28C": {
		code: "28C",
		category: "28",
		name: "Wild Specialty Beer",
		og_min: 1.03,
		og_max: 1.08,
		fg_min: 1,
		fg_max: 1.012,
		abv_min: 3,
		abv_max: 9,
		ibu_min: 0,
		ibu_max: 30,
		ebc_min: 4,
		ebc_max: 40
	},
	"28D": {
		code: "28D",
		category: "28",
		name: "Straight Sour Beer",
		og_min: 1.03,
		og_max: 1.05,
		fg_min: 1,
		fg_max: 1.012,
		abv_min: 3,
		abv_max: 5,
		ibu_min: 0,
		ibu_max: 15,
		ebc_min: 4,
		ebc_max: 16
	},
	"29A": {
		code: "29A",
		category: "29",
		name: "Fruit Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"29B": {
		code: "29B",
		category: "29",
		name: "Fruit and Spice Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"29C": {
		code: "29C",
		category: "29",
		name: "Specialty Fruit Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"29D": {
		code: "29D",
		category: "29",
		name: "Grape Ale",
		og_min: 1.04,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.03,
		abv_min: 4.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 50,
		ebc_min: 4,
		ebc_max: 100
	},
	"30A": {
		code: "30A",
		category: "30",
		name: "Spice, Herb or Vegetable Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"30B": {
		code: "30B",
		category: "30",
		name: "Autumn Seasonal Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"30C": {
		code: "30C",
		category: "30",
		name: "Winter Seasonal Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"31A": {
		code: "31A",
		category: "31",
		name: "Alternative Grain Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"31B": {
		code: "31B",
		category: "31",
		name: "Alternative Sugar Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"32A": {
		code: "32A",
		category: "32",
		name: "Classic Style Smoked Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"32B": {
		code: "32B",
		category: "32",
		name: "Specialty Smoked Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"33A": {
		code: "33A",
		category: "33",
		name: "Wood-Aged Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"33B": {
		code: "33B",
		category: "33",
		name: "Specialty Wood-Aged Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.004,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"34A": {
		code: "34A",
		category: "34",
		name: "Commercial Specialty Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"34B": {
		code: "34B",
		category: "34",
		name: "Mixed-Style Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 5,
		ibu_max: 70,
		ebc_min: 4,
		ebc_max: 100
	},
	"34C": {
		code: "34C",
		category: "34",
		name: "Experimental Beer",
		og_min: 1.03,
		og_max: 1.11,
		fg_min: 1.001,
		fg_max: 1.024,
		abv_min: 2.5,
		abv_max: 12,
		ibu_min: 0,
		ibu_max: 100,
		ebc_min: 0,
		ebc_max: 100
	}
};
function findStyle(q) {
	if (BJCP[q]) return BJCP[q];
	const lq = q.toLowerCase();
	for (const s of Object.values(BJCP)) {
		if (s.name.toLowerCase().includes(lq)) return s;
		if (s.code.toLowerCase() === lq) return s;
	}
	const codeMatch = q.match(/\bBJCP\s+([0-9]+[A-Za-z]?)\b/i);
	if (codeMatch) {
		const code = codeMatch[1].toUpperCase();
		if (BJCP[code]) return BJCP[code];
	}
	const bareCode = q.match(/\b([0-9]{1,2}[A-Z][0-9]?)\b/i);
	if (bareCode) {
		const code = bareCode[1].toUpperCase();
		if (BJCP[code]) return BJCP[code];
	}
}
function findAllStyles(query) {
	const lq = query.toLowerCase();
	const matches = Object.values(BJCP).filter((s) => s.name.toLowerCase().includes(lq) || s.code.toLowerCase().includes(lq));
	if (matches.length > 0) return matches;
	const m = query.match(/\bBJ\s+([0-9A-Z]+)\b/i) ?? query.match(/\b([0-9]{1,2}[A-Z][0-9]?)\b/i);
	if (m) {
		const code = m[1].toUpperCase();
		const s = BJCP[code];
		if (s) return [s];
	}
	return [];
}
const VALID_HOP_USES = /* @__PURE__ */ new Set([
	"boil",
	"whirlpool",
	"dry_hop",
	"first_wort",
	"mash",
	"hopback",
	"dip_hop",
	"hop_stand"
]);
function pickNum(obj, keys) {
	if (!obj) return void 0;
	for (const k of keys) {
		const v = obj[k];
		if (v != null && !Number.isNaN(Number(v))) return Number(v);
	}
}
function pickStr(obj, keys) {
	if (!obj) return void 0;
	for (const k of keys) {
		const v = obj[k];
		if (typeof v === "string" && v.trim() !== "") return v;
	}
}
function parseYamlRecipe(filePath) {
	if (!existsSync(filePath)) throw new Error(`File non trovato: ${filePath}`);
	const raw = readFileSync(filePath, "utf-8");
	const data = load(raw);
	if (typeof data !== "object" || data === null) throw new Error("Il file YAML non contiene un oggetto valido.");
	const d = data;
	const params = d["parametri"] ?? {};
	const recipe_name = String(d["nome"] ?? "");
	const beer_style = String(d["stile"] ?? "");
	const batch_size_liters = Number(params["batch_size_litri"]);
	const og = Number(params["og"]);
	const fg = Number(params["fg"]);
	const ibu = Number(params["ibu"]);
	const ebc = params["ebc"] != null ? Number(params["ebc"]) : void 0;
	const abv_percent = params["abv_percent"] != null ? Number(params["abv_percent"]) : void 0;
	const efficiency_percent = params["efficienza_percent"] != null ? Number(params["efficienza_percent"]) : void 0;
	const bollitura = d["bollitura"] ?? d["bolliura"];
	const boil_time_minutes = pickNum(params, ["bollitura_min", "duracion_bollitura_min"]) ?? pickNum(bollitura, [
		"durata_min",
		"duration_min",
		"duracion_min"
	]);
	const pre_boil_volume_liters = pickNum(params, ["pre_boil_litri", "pre_boil_volumen_litri"]) ?? pickNum(bollitura, [
		"volume_pre_boil_litri",
		"pre_boil_litri",
		"volumen_pre_boil_litri"
	]);
	const post_boil_volume_liters = pickNum(params, ["post_boil_litri", "post_boil_volumen_litri"]) ?? pickNum(bollitura, [
		"volume_post_boil_litri",
		"post_boil_litri",
		"volumen_post_boil_litri"
	]);
	const fermentation_volume_liters = pickNum(params, [
		"fermentatore_litri",
		"volume_fermentatore",
		"fermentador_litri"
	]);
	const packaging_volume_liters = pickNum(params, [
		"confezionamento_litri",
		"confezionamiento_litri",
		"envasado_litri",
		"embotellado_litri"
	]);
	const impianto = typeof params["impianto"] === "string" ? params["impianto"] : void 0;
	const carbonazione = d["carbonazione"] ?? d["carbonatacion"];
	const carbonation_volumes = pickNum(params, ["carbonazione_vol", "co2_volumi"]) ?? pickNum(carbonazione, [
		"co2_volumi",
		"co2_vol",
		"volumen_co2",
		"vol_co2"
	]);
	const carbonation_method = pickStr(params, ["carbonazione_metodo", "metodo_carbonatacion"]) ?? pickStr(carbonazione, ["metodo", "metodo_carbonatacion"]);
	const priming_sugar_gl = pickNum(params, ["priming_gl", "priming_g_l"]) ?? pickNum(carbonazione, [
		"zucchero_g_per_litro",
		"azucar_g_por_litro",
		"priming_gl"
	]);
	const grain_bill = (Array.isArray(d["grist"]) ? d["grist"] : []).map((g) => ({
		malt: String(g["malto"] ?? ""),
		kg: Number(g["kg"] ?? 0),
		percent: g["percent"] != null ? Number(g["percent"]) : void 0,
		ebc: g["ebc"] != null ? Number(g["ebc"]) : void 0,
		note: typeof g["note"] === "string" ? g["note"] : void 0
	}));
	const hop_schedule = (Array.isArray(d["luppolatura"]) ? d["luppolatura"] : []).map((h) => ({
		variety: String(h["varieta"] ?? ""),
		grams: Number(h["grammi"] ?? 0),
		time_minutes: Number(h["tempo_min"] ?? 0),
		use: String(h["uso"] ?? "boil"),
		aa_percent: h["aa_percent"] != null ? Number(h["aa_percent"]) : void 0,
		ibu_contrib: h["ibu_stimati"] != null ? Number(h["ibu_stimati"]) : void 0,
		note: typeof h["note"] === "string" ? h["note"] : void 0
	}));
	const lievito = d["lievito"] ?? {};
	const yeast = {
		strain: String(lievito["ceppo"] ?? ""),
		attenuation_percent: lievito["attenuazione_percent"] != null ? Number(lievito["attenuazione_percent"]) : void 0,
		lab: typeof lievito["laboratorio"] === "string" ? lievito["laboratorio"] : void 0,
		temperature_c_min: lievito["temp_min_c"] != null ? Number(lievito["temp_min_c"]) : void 0,
		temperature_c_max: lievito["temp_max_c"] != null ? Number(lievito["temp_max_c"]) : void 0
	};
	const mash = d["mash"] ?? {};
	const mash_temp_c = mash["temperatura_c"] != null ? Number(mash["temperatura_c"]) : void 0;
	const mash_steps = Array.isArray(mash["steps"]) ? mash["steps"].map((s) => ({
		temperature_c: Number(s["temperatura_c"] ?? 0),
		time_minutes: Number(s["tempo_min"] ?? 0),
		note: typeof s["note"] === "string" ? s["note"] : void 0
	})) : void 0;
	const ferm = d["fermentazione"] ?? {};
	const fermentation_temp_c = ferm["temperatura_c"] != null ? Number(ferm["temperatura_c"]) : void 0;
	const acqua = d["acqua"];
	const water_profile = acqua ? {
		ca: Number(pickNum(acqua, ["ca", "ca_mg_l"]) ?? 0),
		mg: Number(pickNum(acqua, ["mg", "mg_mg_l"]) ?? 0),
		na: Number(pickNum(acqua, ["na", "na_mg_l"]) ?? 0),
		cl: Number(pickNum(acqua, ["cl", "cl_mg_l"]) ?? 0),
		so4: Number(pickNum(acqua, ["so4", "so4_mg_l"]) ?? 0),
		hco3: Number(pickNum(acqua, ["hco3", "hco3_mg_l"]) ?? 0)
	} : void 0;
	const descrizione = typeof d["descrizione"] === "string" ? d["descrizione"] : void 0;
	const note = typeof d["note"] === "string" ? d["note"] : void 0;
	const spezie = Array.isArray(d["spezie"]) ? d["spezie"].map((s) => ({
		nome: String(s["nome"] ?? ""),
		grammi: Number(s["grammi"] ?? 0),
		uso: String(s["uso"] ?? "boil"),
		tempo_min: s["tempo_min"] != null ? Number(s["tempo_min"]) : void 0,
		note: typeof s["note"] === "string" ? s["note"] : void 0
	})) : void 0;
	const zuccheri = Array.isArray(d["zuccheri"]) ? d["zuccheri"].map((z) => ({
		tipo: String(z["tipo"] ?? ""),
		grammi: Number(z["grammi"] ?? 0),
		note: typeof z["note"] === "string" ? z["note"] : void 0
	})) : void 0;
	const agua = d["agua"] ?? d["acqua"];
	const mash_water_liters = pickNum(agua, [
		"mash_litri",
		"mash_agua_litri",
		"strike_litri"
	]) ?? pickNum(mash, [
		"acqua_strike_litri",
		"strike_litri",
		"agua_strike_litri"
	]);
	const sparge_water_liters = pickNum(agua, ["sparge_litri", "sparge_agua_litri"]) ?? pickNum(d["sparge"], [
		"sparge_litri",
		"volumen_litri",
		"litri"
	]);
	const total_water_liters = pickNum(agua, [
		"total_litri",
		"total_agua_litri",
		"agua_total_litri"
	]);
	const sales = d["sales"] ?? d["mash_salts"];
	const mash_salts = sales ? {
		gypsum_g: pickNum(sales, [
			"gesso_g",
			"gypsum_g",
			"gesso"
		]),
		cacl2_g: pickNum(sales, ["cacl2_g", "cacl2"]),
		epsom_g: pickNum(sales, ["epsom_g", "epsom"]),
		nahco3_g: pickNum(sales, ["nahco3_g", "nahco3"]),
		lactic_acid_ml: pickNum(sales, [
			"acido_lactico_ml",
			"lactic_acid_ml",
			"acido_lactico"
		])
	} : void 0;
	const mashInTemp = pickNum(mash, [
		"temperatura_in_c",
		"mash_in_c",
		"temperatura_strike_c",
		"strike_c"
	]);
	const pre_boil_og = pickNum(bollitura, [
		"og_pre_boil",
		"gravedad_pre_boil",
		"pre_boil_og"
	]) ?? pickNum(params, ["og_pre_boil", "pre_boil_og"]);
	const post_boil_og = pickNum(bollitura, [
		"og_post_boil",
		"gravedad_post_boil",
		"post_boil_og"
	]) ?? pickNum(params, ["og_post_boil", "post_boil_og"]);
	const primary_days = pickNum(ferm, [
		"primaria_giorni",
		"primaria_dias",
		"dias_primaria"
	]);
	const conditioning_days = pickNum(ferm, [
		"madurazione_giorni",
		"maduracion_dias",
		"dias_maduracion"
	]);
	const serving_temp_c = pickNum(carbonazione, [
		"temperatura_servizio_c",
		"temperatura_servicio_c",
		"servicio_c"
	]);
	const bottle_type = pickStr(carbonazione, [
		"tipo_botella",
		"tipo_botella",
		"botella"
	]);
	const missing = [];
	if (!recipe_name) missing.push("nome");
	if (!beer_style) missing.push("stile");
	if (isNaN(batch_size_liters) || batch_size_liters <= 0) missing.push("parametri.batch_size_litri");
	if (isNaN(og) || og <= 0) missing.push("parametri.og");
	if (isNaN(fg) || fg <= 0) missing.push("parametri.fg");
	if (isNaN(ibu) || ibu < 0) missing.push("parametri.ibu");
	if (missing.length > 0) throw new Error(`Campi obbligatori mancanti o non validi: ${missing.join(", ")}`);
	return {
		recipe_name,
		beer_style,
		batch_size_liters,
		og,
		fg,
		ibu,
		ebc: isNaN(ebc) ? void 0 : ebc,
		abv_percent: isNaN(abv_percent) ? void 0 : abv_percent,
		efficiency_percent: isNaN(efficiency_percent) ? void 0 : efficiency_percent,
		grain_bill,
		hop_schedule,
		yeast,
		mash_temp_c: isNaN(mash_temp_c) ? void 0 : mash_temp_c,
		mash_steps,
		fermentation_temp_c: isNaN(fermentation_temp_c) ? void 0 : fermentation_temp_c,
		water_profile,
		boil_time_minutes: isNaN(boil_time_minutes) ? void 0 : boil_time_minutes,
		pre_boil_volume_liters: isNaN(pre_boil_volume_liters) ? void 0 : pre_boil_volume_liters,
		post_boil_volume_liters: isNaN(post_boil_volume_liters) ? void 0 : post_boil_volume_liters,
		fermentation_volume_liters: isNaN(fermentation_volume_liters) ? void 0 : fermentation_volume_liters,
		packaging_volume_liters: isNaN(packaging_volume_liters) ? void 0 : packaging_volume_liters,
		carbonation_volumes: isNaN(carbonation_volumes) ? void 0 : carbonation_volumes,
		carbonation_method,
		priming_sugar_gl: isNaN(priming_sugar_gl) ? void 0 : priming_sugar_gl,
		impianto,
		descrizione,
		note,
		spezie,
		zuccheri,
		mash_water_liters: isNaN(mash_water_liters) ? void 0 : mash_water_liters,
		sparge_water_liters: isNaN(sparge_water_liters) ? void 0 : sparge_water_liters,
		total_water_liters: isNaN(total_water_liters) ? void 0 : total_water_liters,
		mash_salts,
		mash_in_temp_c: isNaN(mashInTemp) ? void 0 : mashInTemp,
		pre_boil_og: isNaN(pre_boil_og) ? void 0 : pre_boil_og,
		post_boil_og: isNaN(post_boil_og) ? void 0 : post_boil_og,
		primary_days: isNaN(primary_days) ? void 0 : primary_days,
		conditioning_days: isNaN(conditioning_days) ? void 0 : conditioning_days,
		serving_temp_c: isNaN(serving_temp_c) ? void 0 : serving_temp_c,
		bottle_type,
		rawYaml: raw
	};
}
function validateRecipe(r) {
	const style = findStyle(r.beer_style);
	const issues = [];
	const warnings = [];
	const styleDeviations = [];
	const volumeIssues = [];
	const carbonationIssues = [];
	const abv = (r.og - r.fg) * 131.25;
	const totalGrainKg = r.grain_bill.reduce((s, g) => s + g.kg, 0);
	const totalHopGrams = r.hop_schedule.reduce((s, h) => s + h.grams, 0);
	const dryHopGrams = r.hop_schedule.filter((h) => h.use === "dry_hop").reduce((s, h) => s + h.grams, 0);
	if (style) {
		if (r.og < style.og_min) styleDeviations.push(`OG ${r.og.toFixed(3)} < min ${style.og_min.toFixed(3)}`);
		if (r.og > style.og_max) styleDeviations.push(`OG ${r.og.toFixed(3)} > max ${style.og_max.toFixed(3)}`);
		if (r.fg < style.fg_min) styleDeviations.push(`FG ${r.fg.toFixed(3)} < min ${style.fg_min.toFixed(3)}`);
		if (r.fg > style.fg_max) styleDeviations.push(`FG ${r.fg.toFixed(3)} > max ${style.fg_max.toFixed(3)}`);
		if (r.ibu < style.ibu_min) styleDeviations.push(`IBU ${r.ibu} < min ${style.ibu_min}`);
		if (r.ibu > style.ibu_max) styleDeviations.push(`IBU ${r.ibu} > max ${style.ibu_max}`);
		if (abv < style.abv_min) styleDeviations.push(`ABV ${abv.toFixed(1)}% < min ${style.abv_min}%`);
		if (abv > style.abv_max) styleDeviations.push(`ABV ${abv.toFixed(1)}% > max ${style.abv_max}%`);
		if (r.ebc !== void 0 && (r.ebc < style.ebc_min || r.ebc > style.ebc_max)) styleDeviations.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
	}
	if (style) {
		if (r.og < style.og_min || r.og > style.og_max) issues.push(`OG ${r.og.toFixed(3)} fuori range (${style.og_min.toFixed(3)}–${style.og_max.toFixed(3)})`);
		if (r.ibu < style.ibu_min || r.ibu > style.ibu_max) issues.push(`IBU ${r.ibu} fuori range (${style.ibu_min}–${style.ibu_max})`);
		if (abv < style.abv_min || abv > style.abv_max) issues.push(`ABV ${abv.toFixed(1)}% fuori range (${style.abv_min}–${style.abv_max}%)`);
		if (r.fg < style.fg_min || r.fg > style.fg_max) warnings.push(`FG ${r.fg.toFixed(3)} fuori range (${style.fg_min.toFixed(3)}–${style.fg_max.toFixed(3)})`);
		if (r.ebc !== void 0 && (r.ebc < style.ebc_min || r.ebc > style.ebc_max)) warnings.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
	}
	const ibuRatio = r.ibu / ((r.og - 1) * 1e3);
	const buGu = r.og > 1 ? r.ibu / ((r.og - 1) * 1e3) : 0;
	if (ibuRatio < .2) issues.push("Rapporto IBU/OG molto basso (<0.2) — sbilanciata verso il malto.");
	else if (ibuRatio > 1.5) issues.push("Rapporto IBU/OG molto alto (>1.5) — amaro eccessivo.");
	else if (ibuRatio > 1) warnings.push("Rapporto IBU/OG alto — verifica lo stile.");
	let specPct = 0, basePct = 0;
	for (const g of r.grain_bill) {
		const pct = g.percent ?? g.kg / totalGrainKg * 100;
		const n = g.malt.toLowerCase();
		if (n.includes("pilsner") || n.includes("pale") || n.includes("maris otter") || n.includes("munich") || n.includes("vienna") || n.includes("wheat") || n.includes("base") || n.includes("pils")) basePct += pct;
		if (n.includes("crystal") || n.includes("caramel") || n.includes("chocolate") || n.includes("black") || n.includes("roast") || n.includes("special") || n.includes("cara") || n.includes("melanoidin") || n.includes("aromatic") || n.includes("biscuit")) specPct += pct;
		if (pct > 20 && !n.includes("base") && !n.includes("pilsner") && !n.includes("pale") && !n.includes("pils")) warnings.push(`Malto "${g.malt}" al ${pct.toFixed(0)}% — percentuale alta.`);
	}
	if (specPct > 25) issues.push(`Malti speciali al ${specPct.toFixed(0)}% — rischio dolcezza/astringenza.`);
	else if (specPct > 15) warnings.push(`Malti speciali al ${specPct.toFixed(0)}%.`);
	if (basePct < 60 && totalGrainKg > 0) warnings.push(`Malto base al ${basePct.toFixed(0)}% — basso.`);
	if (dryHopGrams > 20 * r.batch_size_liters) warnings.push(`Dry hop molto alto (${dryHopGrams}g in ${r.batch_size_liters}L) — rischio astringenza/ossidazione.`);
	const hopUses = new Set(r.hop_schedule.map((h) => h.use));
	for (const u of hopUses) if (!VALID_HOP_USES.has(u)) warnings.push(`Uso luppolo sconosciuto: "${u}".`);
	const boilHops = r.hop_schedule.filter((h) => h.use === "boil");
	const hasBittering = boilHops.some((h) => h.time_minutes >= 45);
	if (boilHops.length > 0 && !hasBittering && r.ibu > 10) warnings.push("Nessun luppolo in boil ≥45 min — gli IBU potrebbero provenire solo da whirlpool/hop stand.");
	const boilHopsWithoutAA = boilHops.filter((h) => h.aa_percent === void 0 && h.ibu_contrib === void 0);
	if (boilHopsWithoutAA.length > 0 && boilHops.length > 0) warnings.push(`${boilHopsWithoutAA.length} luppoli in boil senza AA% — impossibile verificare il calcolo IBU.`);
	if (r.mash_temp_c !== void 0) {
		if (r.mash_temp_c < 60) issues.push("Temperatura mash <60°C — enzimi inattivi.");
		else if (r.mash_temp_c < 63) warnings.push("Temperatura mash <63°C — corpo molto secco, possibile scarsa conversione.");
		else if (r.mash_temp_c > 72) warnings.push("Temperatura mash >72°C — corpo pieno, possibile scarsa fermentabilità.");
	}
	if (r.water_profile) {
		const w = r.water_profile;
		const so4cl = w.cl > 0 ? w.so4 / w.cl : 0;
		if (so4cl > 4) warnings.push(`Rapporto SO₄/Cl = ${so4cl.toFixed(1)} — profilo molto amaro (bitter).`);
		else if (so4cl < .5 && w.ca > 0) warnings.push(`Rapporto SO₄/Cl = ${so4cl.toFixed(1)} — profilo morbido (malty).`);
		if (w.hco3 > 250) warnings.push(`Bicarbonati alti (${w.hco3} ppm) — adatto solo a birre scure.`);
		if (w.ca < 50) warnings.push("Calcio basso (<50 ppm) — può influire sulla salute del lievito e sulla flocculazione.");
		if (w.ca > 150) warnings.push("Calcio alto (>150 ppm) — può causare precipitazioni di ossalato.");
		const cationSum = w.ca / 20.04 + w.mg / 12.15 + w.na / 23;
		const anionSum = w.cl / 35.45 + w.so4 / 48.03 + w.hco3 / 61;
		if (Math.abs(cationSum - anionSum) > .5) warnings.push(`Bilancio ionico non neutro (diff ${Math.abs(cationSum - anionSum).toFixed(2)} meq/L) — il profilo acqua potrebbe non essere realistico.`);
	}
	if (r.pre_boil_volume_liters !== void 0 && r.post_boil_volume_liters !== void 0) {
		if (r.pre_boil_volume_liters <= r.post_boil_volume_liters) volumeIssues.push(`Pre-boil (${r.pre_boil_volume_liters}L) ≤ post-boil (${r.post_boil_volume_liters}L) — l'evaporazione è negativa o assente.`);
	}
	if (r.post_boil_volume_liters !== void 0 && r.fermentation_volume_liters !== void 0) {
		if (r.post_boil_volume_liters < r.fermentation_volume_liters) volumeIssues.push(`Post-boil (${r.post_boil_volume_liters}L) < fermentatore (${r.fermentation_volume_liters}L) — volume aumentato senza spiegazione.`);
	}
	if (r.fermentation_volume_liters !== void 0 && r.packaging_volume_liters !== void 0) {
		if (r.packaging_volume_liters > r.fermentation_volume_liters) volumeIssues.push(`Confezionamento (${r.packaging_volume_liters}L) > fermentatore (${r.fermentation_volume_liters}L).`);
	}
	if (r.batch_size_liters > 0) {
		if (r.fermentation_volume_liters !== void 0 && Math.abs(r.fermentation_volume_liters - r.batch_size_liters) > r.batch_size_liters * .3) volumeIssues.push(`Volume fermentatore (${r.fermentation_volume_liters}L) ≠ batch size (${r.batch_size_liters}L) — differenza >30%.`);
		if (r.packaging_volume_liters !== void 0 && Math.abs(r.packaging_volume_liters - r.batch_size_liters) > r.batch_size_liters * .2) volumeIssues.push(`Volume confezionamento (${r.packaging_volume_liters}L) ≠ batch size (${r.batch_size_liters}L) — differenza >20%.`);
	}
	if (r.carbonation_volumes !== void 0) {
		if (r.carbonation_volumes < 1.2) carbonationIssues.push(`Carbonazione molto bassa (${r.carbonation_volumes} vol) — birra quasi piatta.`);
		else if (r.carbonation_volumes > 4) carbonationIssues.push(`Carbonazione molto alta (${r.carbonation_volumes} vol) — rischio bottiglia esplosiva senza bottiglie adeguate.`);
	}
	if (r.priming_sugar_gl !== void 0 && r.carbonation_volumes !== void 0) {
		const expectedPriming = (r.carbonation_volumes - .85) * 4 * r.batch_size_liters;
		if (Math.abs(r.priming_sugar_gl * r.batch_size_liters - expectedPriming) > expectedPriming * .4) carbonationIssues.push(`Dosaggio priming (${r.priming_sugar_gl} g/L) incoerente con carbonazione target (${r.carbonation_volumes} vol).`);
	}
	if (r.abv_percent !== void 0 && Math.abs(r.abv_percent - abv) > .5) warnings.push(`ABV dichiarato (${r.abv_percent}%) ≠ calcolato (${abv.toFixed(1)}%) — differenza >0.5%.`);
	const brewdayMissing = [];
	if (r.mash_water_liters === void 0) brewdayMissing.push("acqua di ammostamento (acqua.mash_litri)");
	if (r.sparge_water_liters === void 0) brewdayMissing.push("acqua di sparge (acqua.sparge_litri)");
	if (r.total_water_liters === void 0) brewdayMissing.push("acqua totale (acqua.total_litri)");
	if (r.mash_salts === void 0) brewdayMissing.push("sali del mash (sales)");
	if (r.mash_in_temp_c === void 0) brewdayMissing.push("temperatura di mash-in (mash.temperatura_in_c)");
	if (r.pre_boil_og === void 0) brewdayMissing.push("gravità pre-boil (bollitura.og_pre_boil)");
	if (r.post_boil_og === void 0) brewdayMissing.push("gravità post-boil (bollitura.og_post_boil)");
	if (r.boil_time_minutes === void 0) brewdayMissing.push("durata della bollitura (parametri.bollitura_min)");
	if (r.fermentation_temp_c === void 0) brewdayMissing.push("temperatura di fermentazione (fermentazione.temperatura_c)");
	if (r.primary_days === void 0) brewdayMissing.push("giorni di fermentazione primaria (fermentazione.primaria_giorni)");
	if (r.carbonation_volumes === void 0) brewdayMissing.push("carbonatazione (carbonazione.co2_volumi)");
	if (r.packaging_volume_liters === void 0) brewdayMissing.push("volume di confezionamento (parametri.confezionamento_litri)");
	if (r.bottle_type === void 0) brewdayMissing.push("tipo di bottiglia (carbonazione.tipo_botella)");
	if (brewdayMissing.length > 0) issues.push(`Dati di quotazione incompleti — mancano: ${brewdayMissing.join(", ")}`);
	if (r.mash_water_liters !== void 0 && r.sparge_water_liters !== void 0 && r.total_water_liters !== void 0) {
		const sum = r.mash_water_liters + r.sparge_water_liters;
		if (Math.abs(sum - r.total_water_liters) > 1) volumeIssues.push(`Acqua totale (${r.total_water_liters}L) ≠ mash (${r.mash_water_liters}L) + sparge (${r.sparge_water_liters}L) = ${sum.toFixed(1)}L`);
	}
	if (r.pre_boil_og !== void 0 && r.post_boil_og !== void 0 && r.post_boil_og < r.pre_boil_og) volumeIssues.push(`OG post-boil (${r.post_boil_og.toFixed(3)}) < OG pre-boil (${r.pre_boil_og.toFixed(3)}) — la bollitura non può ridurre la gravità.`);
	if (r.efficiency_percent !== void 0) {
		if (r.efficiency_percent > 100) warnings.push("Efficienza >100% — impossibile senza errori di misura.");
		else if (r.efficiency_percent < 50) warnings.push("Efficienza <50% — molto bassa, verificare la macinatura e il mash.");
		else if (r.efficiency_percent > 85) warnings.push("Efficienza >85% — molto alta per homebrewing standard.");
	}
	if (totalGrainKg > 0 && r.batch_size_liters > 0) {
		const expectedMaxOG = 1 + totalGrainKg * .08 / r.batch_size_liters;
		if (r.og > expectedMaxOG * 1.05) warnings.push(`OG (${r.og.toFixed(3)}) troppo alto per ${totalGrainKg.toFixed(1)}kg di grani in ${r.batch_size_liters}L (max stimato ~${expectedMaxOG.toFixed(3)}).`);
	}
	return {
		issues,
		warnings,
		abv,
		ibuRatio,
		specPct,
		totalGrainKg,
		totalHopGrams,
		dryHopGrams,
		buGu,
		styleName: style?.name,
		styleCode: style?.code,
		styleMatch: styleDeviations.length === 0,
		styleDeviations,
		volumeIssues,
		carbonationIssues
	};
}
var YamlValidatorTool = class {
	name = "yaml_validator";
	description = "Validate a beer recipe YAML file against BJCP style guidelines. Reads the YAML and runs ALL deterministic checks: OG, FG, ABV, IBU, EBC, grain bill composition, hop schedule, mash temperature, water profile, volume consistency, carbonation, efficiency sanity, and more. Use this FIRST when validating a recipe. Then use recipe_validator with the structured data for LLM qualitative review.";
	parameters = toInputJsonSchema(YamlValidatorInputSchema);
	resolveExecution(args) {
		return {
			description: `Validate YAML recipe: ${args.input_file}`,
			approvalRule: this.name,
			execute: () => this.execute(args)
		};
	}
	execute(args) {
		try {
			const recipe = parseYamlRecipe(args.input_file);
			const v = validateRecipe(recipe);
			const style = findStyle(recipe.beer_style);
			const allMatches = findAllStyles(recipe.beer_style);
			const valid = v.issues.length === 0;
			const report = [
				`**Validazione ricetta: ${recipe.recipe_name}**`,
				`File: ${args.input_file}`,
				style ? `Stile: ${style.code} — ${style.name} (Cat. ${style.category})` : allMatches.length > 0 ? `Stile "${recipe.beer_style}" non trovato esattamente. Stili simili: ${allMatches.map((s) => `${s.code} ${s.name}`).join(", ")}` : `Stile "${recipe.beer_style}" non trovato nel database BJCP.`,
				"",
				"── Parametri calcolati ──",
				`ABV: ${v.abv.toFixed(1)}% | IBU/OG: ${v.ibuRatio.toFixed(2)} | BU/GU: ${v.buGu.toFixed(2)}`,
				`Malti speciali: ${v.specPct.toFixed(1)}% | Grani: ${v.totalGrainKg.toFixed(2)}kg | Luppolo: ${v.totalHopGrams}g (dry: ${v.dryHopGrams}g)`,
				style ? `Stile BJCP: ${v.styleMatch ? "✅ IN STYLE" : "❌ FUORI STILE"}` : "",
				"",
				valid ? "✅ Valida — nessun errore critico." : "❌ Errori critici:",
				...v.issues.map((i) => `  ❌ ${i}`),
				...v.warnings.length ? [
					"",
					"⚠️ Avvisi:",
					...v.warnings.map((w) => `  ⚠️ ${w}`)
				] : [],
				...v.volumeIssues.length ? [
					"",
					"📐 Problemi volumi:",
					...v.volumeIssues.map((iv) => `  📐 ${iv}`)
				] : [],
				...v.carbonationIssues.length ? [
					"",
					"🫧 Problemi carbonazione:",
					...v.carbonationIssues.map((ic) => `  🫧 ${ic}`)
				] : [],
				"",
				"── Dati di quotazione (brewday) ──",
				`Acqua: mash ${recipe.mash_water_liters ?? "?"}L, sparge ${recipe.sparge_water_liters ?? "?"}L, totale ${recipe.total_water_liters ?? "?"}L`,
				recipe.mash_salts ? `Sali del mash: ${[
					recipe.mash_salts.gypsum_g !== void 0 ? `gesso ${recipe.mash_salts.gypsum_g}g` : null,
					recipe.mash_salts.cacl2_g !== void 0 ? `CaCl₂ ${recipe.mash_salts.cacl2_g}g` : null,
					recipe.mash_salts.epsom_g !== void 0 ? `Epsom ${recipe.mash_salts.epsom_g}g` : null,
					recipe.mash_salts.nahco3_g !== void 0 ? `NaHCO₃ ${recipe.mash_salts.nahco3_g}g` : null,
					recipe.mash_salts.lactic_acid_ml !== void 0 ? `acido lattico ${recipe.mash_salts.lactic_acid_ml}ml` : null
				].filter((x) => x !== null).join(", ") || "nessuno"}` : "Sali del mash: non specificati",
				`Mash-in: ${recipe.mash_in_temp_c ?? "?"}°C | OG pre-boil: ${recipe.pre_boil_og?.toFixed(3) ?? "?"} | OG post-boil: ${recipe.post_boil_og?.toFixed(3) ?? "?"}`,
				`Fermentazione: ${recipe.primary_days ?? "?"} giorni primaria${recipe.conditioning_days !== void 0 ? `, ${recipe.conditioning_days} giorni di maturazione` : ""} a ${recipe.fermentation_temp_c ?? "?"}°C`,
				`Confezionamento: ${recipe.packaging_volume_liters ?? "?"}L${recipe.bottle_type ? ` in ${recipe.bottle_type}` : ""}${recipe.carbonation_volumes !== void 0 ? `, ${recipe.carbonation_volumes} vol CO₂` : ""}${recipe.serving_temp_c !== void 0 ? `, servizio ${recipe.serving_temp_c}°C` : ""}`,
				"IMPORTANTE i campi dello YAML devono corrispondere allo schema, non solo semanticamente ma anche sintatticamente, altrimenti il validatore non li riconosce.",
				"",
				"💡 Usa recipe_validator con i dati strutturati per la revisione qualitativa LLM."
			].join("\n");
			return Promise.resolve({ output: report });
		} catch (e) {
			return Promise.resolve({
				isError: true,
				output: e instanceof Error ? e.message : String(e)
			});
		}
	}
};
registerTool(YamlValidatorTool);

//#endregion
//#region src/server.ts
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "brewmaster";
const SERVER_VERSION = "1.0.0";
const tools = getRegisteredTools().map((Ctor) => new Ctor());
const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
async function handleRequest(message) {
	switch (message.method) {
		case "initialize": return {
			protocolVersion: PROTOCOL_VERSION,
			capabilities: { tools: {} },
			serverInfo: {
				name: SERVER_NAME,
				version: SERVER_VERSION
			}
		};
		case "ping": return {};
		case "tools/list": return { tools: tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.parameters
		})) };
		case "tools/call": return runTool(message.params);
		default: throw jsonRpcError(-32601, `Method not found: ${message.method}`);
	}
}
async function runTool(params) {
	const name = typeof params?.["name"] === "string" ? params["name"] : void 0;
	const args = params?.["arguments"] ?? {};
	if (!name) throw jsonRpcError(-32602, "Missing tool name.");
	const tool = toolsByName.get(name);
	if (!tool) throw jsonRpcError(-32602, `Unknown tool: ${name}`);
	try {
		const execution = await tool.resolveExecution(args);
		const controller = new AbortController();
		const result = await execution.execute({
			turnId: 0,
			toolCallId: `${name}-${Date.now()}`,
			signal: controller.signal
		});
		return {
			content: [{
				type: "text",
				text: result.output
			}],
			isError: result.isError === true
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: error instanceof Error ? error.message : String(error)
			}],
			isError: true
		};
	}
}
function jsonRpcError(code, message) {
	const error = new Error(message);
	error.code = code;
	return error;
}
readline.createInterface({
	input: process.stdin,
	terminal: false
}).on("line", (line) => {
	const trimmed = line.trim();
	if (!trimmed) return;
	let message;
	try {
		message = JSON.parse(trimmed);
	} catch {
		return;
	}
	if (message.id === void 0) return;
	if (!message.method) return;
	handleRequest({
		method: message.method,
		params: message.params
	}).then((result) => {
		process.stdout.write(`${JSON.stringify({
			jsonrpc: "2.0",
			id: message.id,
			result
		})}\n`);
	}).catch((error) => {
		process.stdout.write(`${JSON.stringify({
			jsonrpc: "2.0",
			id: message.id,
			error: {
				code: error.code ?? -32e3,
				message: error.message
			}
		})}\n`);
	});
});

//#endregion
export {  };