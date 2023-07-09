export const fs_depth = /*glsl*/ `
#include <packing>
varying vec2 vHighPrecisionZW;

void main() {
  vec2 uv = (gl_PointCoord - 0.5) * 2.0;
  if (length(uv) > 0.4) discard;

  float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
  gl_FragColor = packDepthToRGBA( fragCoordZ );
}
`;
