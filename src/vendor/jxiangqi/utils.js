/**
 * Remove undefined and null from array.
 * @param {Object[]} array - The array.
 * @return {Object[]}
 */
export const compact = function(array) {
  return array.filter(function(e) {
    return typeof e !== 'undefined' && e !== null;
  });
};

/**
 * Is the object not undefined and not null 
 * @param {Object} e - The object.
 * @return {boolean}
 */
export const exists = function(e) {
  return typeof e !== 'undefined' && e !== null;
};

/**
 * Flatten a multidimensional array.
 * @param {Object[]} array - The array.
 * @param {number} [depth=1] - How deep to flatten.
 * @return {Object[]}
 */
export const flat = function(array, depth = 1) {
  return array.reduce(function (element, toFlatten) {
    return element.concat((Array.isArray(toFlatten) && (depth>1
)) ? flat(toFlatten, depth-1) : toFlatten);
  }, []);
};

