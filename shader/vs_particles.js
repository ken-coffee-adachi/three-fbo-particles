export const vs_particles = /*glsl*/ `
uniform sampler2D map;
uniform float width;
uniform float height;
uniform float pointSize;

varying vec3 vLocalPos;

void main() {
  vec2 uv = position.xy + vec2( 0.5 / width, 0.5 / height );
  vLocalPos = texture2D( map, uv ).rgb;
  vec4 mvPosition = modelViewMatrix * vec4( vLocalPos, 1.0 );

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = pointSize * (1.0 / -mvPosition.z);
}
`;
