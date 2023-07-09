export const vs_depth = /*glsl*/ `
uniform sampler2D map;
uniform float width;
uniform float height;
uniform float pointSize;

varying vec2 vHighPrecisionZW;

void main() {
  vec2 uv = position.xy + vec2( 0.5 / width, 0.5 / height );
  vec3 pos = texture2D( map, uv ).rgb;
  vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = pointSize;

  vHighPrecisionZW = gl_Position.zw;
}
`;
