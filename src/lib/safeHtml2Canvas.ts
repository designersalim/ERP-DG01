import html2canvas from 'html2canvas';

function parseAndConvertOklab(str: string): string {
  if (!str || !str.includes('oklab')) return str;
  
  const oklabMatches = str.match(/oklab\([^)]+\)/gi);
  if (!oklabMatches) return str;
  
  let result = str;
  for (const match of oklabMatches) {
    try {
      const inner = match.slice(6, -1);
      const tokens = inner.match(/[-+]?[\d.]+%?/g);
      if (!tokens || tokens.length < 3) continue;
      
      const lStr = tokens[0];
      const aStr = tokens[1];
      const bStr = tokens[2];
      const alphaStr = tokens[3] || '1';
      
      let labL = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      let labA = parseFloat(aStr);
      let labB = parseFloat(bStr);
      let a = alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr);
      
      if (isNaN(labL) || isNaN(labA) || isNaN(labB)) continue;
      if (isNaN(a)) a = 1;

      // OKLAB to LMS
      const l_ = labL + 0.3963377774 * labA + 0.2158037573 * labB;
      const m_ = labL - 0.1055613458 * labA - 0.0638541728 * labB;
      const s_ = labL - 0.0894841775 * labA - 1.2914855480 * labB;

      // Cube LMS
      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      // LMS to sRGB (linear)
      let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      let b = -0.0041960863 * l3 - 0.7034186145 * m3 + 1.7076147010 * s3;

      // Linear to standard sRGB gamma function
      const gamma = (val: number) => {
        if (val <= 0.0031308) {
          return 12.92 * val;
        }
        return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
      };

      let r_std = Math.min(255, Math.max(0, Math.round(gamma(r) * 255)));
      let g_std = Math.min(255, Math.max(0, Math.round(gamma(g) * 255)));
      let b_std = Math.min(255, Math.max(0, Math.round(gamma(b) * 255)));

      const rgbaStr = `rgba(${r_std}, ${g_std}, ${b_std}, ${a})`;
      result = result.replace(match, rgbaStr);
    } catch (e) {
      // ignore
    }
  }
  return result;
}

function parseAndConvertOklch(str: string): string {
  if (!str || !str.includes('oklch')) return str;
  
  // Clean up and match any oklch(...) occurrences
  const oklchMatches = str.match(/oklch\([^)]+\)/gi);
  if (!oklchMatches) return str;
  
  let result = str;
  for (const match of oklchMatches) {
    try {
      // Extract any number-like tokens from within the parentheses
      const inner = match.slice(6, -1);
      const tokens = inner.match(/[-+]?[\d.]+%?/g);
      if (!tokens || tokens.length < 3) continue;
      
      const lStr = tokens[0];
      const cStr = tokens[1];
      const hStr = tokens[2];
      const aStr = tokens[3] || '1';
      
      let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      let c = parseFloat(cStr);
      let h = parseFloat(hStr);
      let a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) continue;
      if (isNaN(a)) a = 1;
      
      // OKLCH to OKLAB
      const theta = (h * Math.PI) / 180;
      const labL = l;
      const labA = c * Math.cos(theta);
      const labB = c * Math.sin(theta);

      // OKLAB to LMS
      const l_ = labL + 0.3963377774 * labA + 0.2158037573 * labB;
      const m_ = labL - 0.1055613458 * labA - 0.0638541728 * labB;
      const s_ = labL - 0.0894841775 * labA - 1.2914855480 * labB;

      // Cube LMS
      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      // LMS to sRGB (linear)
      let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      let b = -0.0041960863 * l3 - 0.7034186145 * m3 + 1.7076147010 * s3;

      // Linear to standard sRGB gamma function
      const gamma = (val: number) => {
        if (val <= 0.0031308) {
          return 12.92 * val;
        }
        return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
      };

      let r_std = Math.min(255, Math.max(0, Math.round(gamma(r) * 255)));
      let g_std = Math.min(255, Math.max(0, Math.round(gamma(g) * 255)));
      let b_std = Math.min(255, Math.max(0, Math.round(gamma(b) * 255)));

      const rgbaStr = `rgba(${r_std}, ${g_std}, ${b_std}, ${a})`;
      result = result.replace(match, rgbaStr);
    } catch (e) {
      // Return original match if fails to parse
    }
  }
  return result;
}

function parseAndConvertColors(str: string): string {
  let result = str;
  result = parseAndConvertOklch(result);
  result = parseAndConvertOklab(result);
  return result;
}

export async function withSafeColorContext<T>(fn: () => Promise<T>): Promise<T> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
  const originalGetter = originalDescriptor?.get;

  const originalGetComputedStyle = window.getComputedStyle;
  const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;

  // Intercept cssRules
  if (originalDescriptor && originalGetter) {
    try {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get() {
          try {
            const rules = originalGetter.call(this);
            if (!rules) return rules;

            const ruleArray = Array.from(rules);
            const needsFiltering = ruleArray.some((rule: any) => rule.cssText && (rule.cssText.includes('oklch') || rule.cssText.includes('oklab')));
            
            if (!needsFiltering) {
              return rules;
            }

            const filteredRules = ruleArray.filter((rule: any) => {
              try {
                return !rule.cssText || (!rule.cssText.includes('oklch') && !rule.cssText.includes('oklab'));
              } catch (e) {
                return true;
              }
            });

            // Return a CSSRuleList-like proxy
            return new Proxy(rules, {
              get(target, prop) {
                if (prop === 'length') {
                  return filteredRules.length;
                }
                if (prop === 'item') {
                  return (index: number) => filteredRules[index] || null;
                }
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                  const index = parseInt(prop, 10);
                  return filteredRules[index];
                }
                if (prop === Symbol.iterator) {
                  return function* () {
                    for (const rule of filteredRules) {
                      yield rule;
                    }
                  };
                }
                return Reflect.get(target, prop);
              }
            });
          } catch (e) {
            return null;
          }
        },
        configurable: true
      });
    } catch (e) {
      console.warn('safeHtml2Canvas: Failed to override cssRules', e);
    }
  }

  // Intercept getPropertyValue
  if (originalGetPropertyValue) {
    try {
      CSSStyleDeclaration.prototype.getPropertyValue = function (property: string) {
        const val = originalGetPropertyValue.call(this, property);
        return parseAndConvertColors(val);
      };
    } catch (e) {
      console.warn('safeHtml2Canvas: Failed to override getPropertyValue', e);
    }
  }

  // Intercept getComputedStyle to replace active color computed values with fallback RGBA translations
  if (originalGetComputedStyle) {
    try {
      Object.defineProperty(window, 'getComputedStyle', {
        value: function (elt: Element, pseudoElt?: string | null) {
          const style = originalGetComputedStyle(elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              const val = Reflect.get(target, prop);
              if (typeof val === 'function') {
                if (prop === 'getPropertyValue') {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    return parseAndConvertColors(originalVal);
                  };
                }
                return val.bind(target);
              }
              if (typeof val === 'string') {
                return parseAndConvertColors(val);
              }
              return val;
            }
          });
        },
        configurable: true,
        writable: true
      });
    } catch (e) {
      console.warn('safeHtml2Canvas: Failed to override getComputedStyle', e);
    }
  }

  try {
    return await fn();
  } finally {
    // Restore cssRules
    if (originalDescriptor) {
      try {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', originalDescriptor);
      } catch (e) {
        console.warn('safeHtml2Canvas: Failed to restore cssRules', e);
      }
    }
    // Restore getPropertyValue
    if (originalGetPropertyValue) {
      try {
        CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      } catch (e) {
        console.warn('safeHtml2Canvas: Failed to restore getPropertyValue', e);
      }
    }
    // Restore getComputedStyle
    if (originalGetComputedStyle) {
      try {
        Object.defineProperty(window, 'getComputedStyle', {
          value: originalGetComputedStyle,
          configurable: true,
          writable: true
        });
      } catch (e) {
        console.warn('safeHtml2Canvas: Failed to restore getComputedStyle', e);
      }
    }
  }
}

export default async function safeHtml2Canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement> {
  return withSafeColorContext(() => html2canvas(element, options));
}
