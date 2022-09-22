// https://github.com/FrankerFaceZ/FrankerFaceZ/blob/bc0eab4409f09beeae1974c1c4550f8366996cff/src/utilities/color.js

function bit2linear(c: number) {
	return (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function linear2bit(c: number) {
	return (c <= 0.0031308) ? c * 12.92 : Math.pow(1.055 * c, 1 / 2.4) - 0.055;
}

function hue2rgb(p: number, q: number, t: number) {
	if(t < 0) {
		t += 1;
	}
	if(t > 1) {
		t -= 1;
	}
	if(t < 1 / 6) {
		return p + (q - p) * 6 * t;
	}
	if(t < 1 / 2) {
		return q;
	}
	if(t < 2 / 3) {
		return p + (q - p) * (2 / 3 - t) * 6;
	}
	return p;
}

function constrain(n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max);
}

class HSLAColor {
	constructor(public h = 0, public s = 0, public l = 0, public a = 0) {}
	static fromRGBA(r: number, g: number, b: number, a = 1) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = constrain((max + min) / 2, 0, 1);
		const d = constrain(max - min, 0, 1);
		let h: number;
		let s: number;
		if(d === 0) {
			h = 0;
			s = 0;
		}
		else {
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max) {
				case r: {
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				}
				case g: {
					h = (b - r) / d + 2;
					break;
				}
				case b: {
					h = (r - g) / d + 4;
					break;
				}
			}
			h! /= 6;
		}
		return new HSLAColor(h!, s, l, a);
	}
	toRGBA() {
		return RGBAColor.fromHSLA(this.h, this.s, this.l, this.a);
	}
	targetLuminance(target: number) {
		let s = this.s;
		let min = 0;
		let max = 1;
		s *= Math.pow(this.l > 0.5 ? -this.l : this.l - 1, 7) + 1;
		let d = (max - min) / 2;
		let mid = min + d;
		for(; d > 1 / 65536; d /= 2, mid = min + d) {
			const luminance = RGBAColor.fromHSLA(this.h, s, mid).luminance();
			if(luminance > target) {
				max = mid;
			}
			else {
				min = mid;
			}
		}
		return new HSLAColor(this.h, s, mid, this.a);
	}
	_h(newH: number) {
		return new HSLAColor(newH, this.s, this.l, this.a);
	}
	_s(newS: number) {
		return new HSLAColor(this.h, newS, this.l, this.a);
	}
	_l(newL: number) {
		return new HSLAColor(this.h, this.s, newL, this.a);
	}
	_a(newA: number) {
		return new HSLAColor(this.h, this.s, this.l, newA);
	}
}

class RGBAColor {
	constructor(public r = 0, public g = 0, public b = 0, public a = 0) {}
	static fromHex(code: string, alpha = 1) {
		if(code[0] === '#') {
			code = code.slice(1);
		}
		if(code.length === 3) {
			code = `${code[0]}${code[0]}${code[1]}${code[1]}${code[2]}${code[2]}`;
		}
		else if(code.length === 4) {
			code = `${code[0]}${code[0]}${code[1]}${code[1]}${code[2]}${code[2]}${code[3]}${code[3]}`;
		}
		if(code.length === 8) {
			alpha = parseInt(code.slice(6), 16) / 255;
			code = code.slice(0, 6);
		}
		else if(code.length !== 6) {
			throw new Error(`Invalid hex code: ${code}`);
		}
		const raw = parseInt(code, 16);
		return new RGBAColor((raw >> 16) & 0xFF, (raw >> 8) & 0xFF, raw & 0xFF, alpha);
	}
	static fromCSS(rgb: string): RGBAColor {
		if(!rgb) {
			throw new Error(`Invalid CSS color: ${rgb}`);
		}
		rgb = rgb.trim();
		if(rgb[0] === '#') {
			return RGBAColor.fromHex(rgb);
		}
		const match = /rgba?\( *(\d+%?) *, *(\d+%?) *, *(\d+%?) *(?:, *([\d.]+))?\)/i.exec(rgb);
		if(!match) {
			return RGBAColor.fromName(rgb);
		}
		let [ , _r, _g, _b, _a ] = match;
		const r = _r[_r.length - 1] === '%' ? parseInt(_r, 10) / 100 * 255 : parseInt(_r, 10);
		const g = _g[_g.length - 1] === '%' ? parseInt(_g, 10) / 100 * 255 : parseInt(_g, 10);
		const b = _b[_b.length - 1] === '%' ? parseInt(_b, 10) / 100 * 255 : parseInt(_b, 10);
		const a = !_a ? 1 : (_a[_a.length - 1] === '%' ? parseInt(_a, 10) / 100 : parseFloat(_a));
		return new RGBAColor(
			constrain(r, 0, 255),
			constrain(g, 0, 255),
			constrain(b, 0, 255),
			constrain(a, 0, 1)
		);
	}
	static fromName(name: string): RGBAColor {
		console.log(`fromName('${name}')`);
		throw new Error('Not implemented');
	}
	static fromHSLA(h: number, s: number, l: number, a = 1) {
		if(s === 0) {
			const v = Math.round(constrain(255 * l, 0, 255));
			return new RGBAColor(v, v, v, a);
		}
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		return new RGBAColor(
			Math.round(constrain(255 * hue2rgb(p, q, h + 1 / 3), 0, 255)),
			Math.round(constrain(255 * hue2rgb(p, q, h), 0, 255)),
			Math.round(constrain(255 * hue2rgb(p, q, h - 1 / 3), 0, 255)),
			a
		);
	}
	static fromXYZA(x: number, y: number, z: number, a = 1) {
		const R =  3.240479 * x - 1.537150 * y - 0.498535 * z;
		const G = -0.969256 * x + 1.875992 * y + 0.041556 * z;
		const B =  0.055648 * x - 0.204043 * y + 1.057311 * z;
		return new RGBAColor(
			constrain(255 * linear2bit(R), 0, 255),
			constrain(255 * linear2bit(G), 0, 255),
			constrain(255 * linear2bit(B), 0, 255),
			a
		);
	}
	get rgb() {
		return [ this.r, this.g, this.b ];
	}
	toHSLA() {
		return HSLAColor.fromRGBA(this.r, this.g, this.b, this.a);
	}
	toXYZA() {
		return XYZAColor.fromRGBA(this.r, this.g, this.b, this.a);
	}
	toLUVA() {
		return this.toXYZA().toLUVA();
	}
	toCSS() {
		const { rgb, a } = this;
		return `rgb${a !== 1 ? 'a' : ''}(${rgb.map(n => Math.round(n))}${a !== 1 ? `, ${a}` : ''})`;
	}
	luminance() {
		const [ r, g, b ] = this.rgb.map(n => bit2linear(n / 255));
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}
	getY() {
		return (0.299 * this.r + 0.587 * this.g + 0.114 * this.b) / 255;
	}
	brighten(): RGBAColor {
		throw new Error('Method not implemented.');
	}
	brighen(arg0: number): RGBAColor {
		throw new Error('Method not implemented.');
	}
}

class LUVAColor {
	constructor(public l = 0, public u = 0, public v = 0, public a = 0) {}
	static fromXYZA(X: number, Y: number, Z: number, a = 1) {
		const deltaGammaFactor = 1 / (XYZAColor.WHITE.x + 15 * XYZAColor.WHITE.y + 3 * XYZAColor.WHITE.z);
		const uDeltaGamma = 4 * XYZAColor.WHITE.x * deltaGammaFactor;
		const vDeltaGamma = 9 * XYZAColor.WHITE.y * deltaGammaFactor;
		const yGamma = Y / XYZAColor.WHITE.y;
		let deltaDivider = (X + 15 * Y + 3 * Z) || 1;
		const deltaFactor = 1 / deltaDivider;
		const uDelta = 4 * X * deltaFactor;
		const vDelta = 9 * Y * deltaFactor;
		const L = yGamma > XYZAColor.EPSILON ? 116 * Math.pow(yGamma, 1 / 3) - 16 : XYZAColor.KAPPA * yGamma;
		const u = 13 * L * (uDelta - uDeltaGamma);
		const v = 13 * L * (vDelta - vDeltaGamma);
		return new LUVAColor(L, u, v, a);
	}
	toXYZA() {
		return XYZAColor.fromLUVA(this.l, this.u, this.v, this.a);
	}
	toRGBA() {
		return this.toXYZA().toRGBA();
	}
	_l(newL: number) {
		return new LUVAColor(newL, this.u, this.v, this.a);
	}
	_u(newU: number) {
		return new LUVAColor(this.l, newU, this.v, this.a);
	}
	_v(newV: number) {
		return new LUVAColor(this.l, this.u, newV, this.a);
	}
	_a(newA: number) {
		return new LUVAColor(this.l, this.u, this.v, newA);
	}
}

class XYZAColor {
	constructor(public x = 0, public y = 0, public z = 0, public a = 0) {}
	static EPSILON: number = Math.pow(6 / 29, 3);
	static KAPPA: number = Math.pow(29 / 3, 3);
	static WHITE: XYZAColor = XYZAColor.fromRGBA(255, 255, 255, 1);
	static fromRGBA(r: number, g: number, b: number, a = 1) {
		const [ R, G, B ] = [ r, g, b ].map(n => bit2linear(n / 255));
		return new XYZAColor(
			0.412453 * R + 0.357580 * G + 0.180423 * B,
			0.212671 * R + 0.715160 * G + 0.072169 * B,
			0.019334 * R + 0.119193 * G + 0.950227 * B,
			a
		);
	}
	static fromLUVA(l: number, u: number, v: number, alpha = 1) {
		const deltaGammaFactor = 1 / (XYZAColor.WHITE.x + 15 * XYZAColor.WHITE.y + 3 * XYZAColor.WHITE.z);
		const uDeltaGamma = 4 * XYZAColor.WHITE.x * deltaGammaFactor;
		const vDeltaGamma = 9 * XYZAColor.WHITE.y * deltaGammaFactor;
		const Y = l > 8 ? Math.pow((l + 16) / 116, 3) : l / XYZAColor.KAPPA;
		const a = 1 / 3 * (52 * l / (u + 13 * l * uDeltaGamma) - 1);
		const b = -5 * Y;
		const c = -1 / 3;
		const d = Y * (39 * l / (v + 13 * l * vDeltaGamma) - 5);
		const X = (d - b) / (a - c);
		const Z = X * a + b;
		return new XYZAColor(X, Y, Z, alpha);
	}
	get xyz() {
		return [ this.x, this.y, this.z ];
	}
	toLUVA() {
		return LUVAColor.fromXYZA(this.x, this.y, this.z, this.a);
	}
	toRGBA() {
		return RGBAColor.fromXYZA(this.x, this.y, this.z, this.a);
	}
}

export class ColorAdjuster {
	cache: Map<string, string>;
	private dark: boolean;
	private luv: number | null;
	private luma: number | null;
	constructor(public base: string, public mode: number, public contrast: number) {
		this.cache = new Map();
		this.dark = false;
		this.luv = null;
		this.luma = null;
		this.rebuildContrast();
	}
	resetCache() {
		this.cache.clear();
	}
	rebuildContrast() {
		this.cache.clear();
		const base = RGBAColor.fromCSS(this.base);
		this.dark = base.luminance() < 0.5;
		if(this.dark) {
			this.luv = new XYZAColor(
				0,
				this.contrast * (base.toXYZA().y + 0.05) - 0.05,
				0,
				1
			)
			.toLUVA()
			.l;
			this.luma = this.contrast * (base.luminance() + 0.05) - 0.05;
		}
	}
	process(color?: string | RGBAColor | null): string | null {
		if(!color) {
			return null;
		}
		else if(color instanceof RGBAColor) {
			color = color.toCSS();
		}
		if(this.mode === -1) {
			return '';
		}
		else if(this.mode === 0) {
			return color;
		}
		if(!color) {
			return null;
		}
		if(this.cache.has(color)) {
			return this.cache.get(color) ?? null;
		}
		let rgb: RGBAColor;
		try {
			rgb = RGBAColor.fromCSS(color);
		} catch(err) {
			throw err;
		}
		// HSL Luma
		if(this.mode === 1) {
			const luma = rgb.luminance();
			if(this.dark ? luma < this.luma! : luma > this.luma!) {
				rgb = rgb.toHSLA().targetLuminance(this.luma!).toRGBA();
			}
		}
		// LUV
		else if(this.mode === 2) {
			const luv = rgb.toLUVA();
			if(this.dark ? luv.l < this.luv! : luv.l > this.luv!) {
				rgb = luv._l(this.luv!).toRGBA();
			}
		}
		// HSL Loop (BTTV)
		else if(this.mode === 3) {
			if(this.dark) {
				while(rgb.getY() < 0.5) {
					const hsl = rgb.toHSLA();
					rgb = hsl._l(constrain(0.1 + 0.9 * hsl.l, 0, 1)).toRGBA();
				}
			}
			else {
				while(rgb.getY() >= 0.5) {
					const hsl = rgb.toHSLA();
					rgb = hsl._l(constrain(0.9 * hsl.l, 0, 1)).toRGBA();
				}
			}
		}
		// RGB Loop
		else if(this.mode === 4) {
			let i = 0;
			if(this.dark) {
				while(rgb.luminance() < 0.15 && i++ < 127) {
					rgb = rgb.brighten();
				}
			}
			else {
				while(rgb.luminance() > 0.3 && i++ < 127) {
					rgb = rgb.brighen(-1);
				}
			}
		}
		const out = rgb.toCSS();
		this.cache.set(color, out);
		return out;
	}
}