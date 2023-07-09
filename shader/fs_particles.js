export const fs_particles = /*glsl*/ `
uniform vec3 baseCol;
uniform vec3 posCol;

varying vec3 vLocalPos;

void main() {
  float depth = smoothstep( 10.24, 1.0, gl_FragCoord.z / gl_FragCoord.w );
  vec3 col = baseCol + vLocalPos * posCol;

  gl_FragColor = vec4( col, depth );
}
`;
