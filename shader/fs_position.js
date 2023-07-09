export const fs_position = /*glsl*/ `
uniform sampler2D origin;
uniform float timer;
uniform vec4 mousePos;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 runSimulation(vec4 pos) {
  float x = pos.x + timer;
  float y = pos.y;
  float z = pos.z;
  
  pos.x += sin( y * 3.0 ) * cos( z * 11.0 ) * 0.005;
  pos.y += sin( x * 5.0 ) * cos( z * 13.0 ) * 0.005;
  pos.z += sin( x * 7.0 ) * cos( y * 17.0 ) * 0.005;

  vec3 posToMouse = pos.xyz - mousePos.xyz;
  float dist = mousePos.w - length(posToMouse);
  if (dist > 0.0) {
    pos += vec4(normalize(posToMouse) * mousePos.w / 10.0, 0.0);
  }

  return pos;
}

void main() {
  vec2 cellSize = 1.0 / resolution.xy;
  vec2 uv = gl_FragCoord.xy * cellSize;

  vec4 pos = vec4(0);
  if ( rand(uv + timer ) > 0.97 ) {
    pos = texture2D( origin, uv );
  } else {
    pos = texture2D( tPositions, uv );
    pos = runSimulation(pos);
  }

  gl_FragColor = pos;
}
`;
