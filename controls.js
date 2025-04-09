import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function initControls(camera, domElement) {
    const controls = new OrbitControls(camera, domElement);

    // 컨트롤 설정 (Google Earth와 유사하게)
    controls.enableDamping = true; // 부드러운 움직임 효과 (관성)
    controls.dampingFactor = 0.05; // 댐핑 강도

    controls.screenSpacePanning = false; // false면 카메라가 항상 타겟 지점을 중심으로 회전

    controls.minDistance = 1.2; // 최소 줌 거리 (지구 표면에 너무 가까워지지 않도록)
    controls.maxDistance = 10; // 최대 줌 거리

    controls.enablePan = true; // 마우스 오른쪽 버튼 (또는 Ctrl/Cmd + 왼쪽 버튼)으로 패닝 활성화
    // controls.panSpeed = 1.0;

    controls.enableZoom = true; // 마우스 휠 또는 스크롤 제스처로 줌 활성화
    controls.zoomSpeed = 2.5;

    controls.enableRotate = true; // 마우스 왼쪽 버튼으로 회전 활성화
    // controls.rotateSpeed = 1.0;

    // 자동 회전 비활성화
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.3;

    // 수직 회전 각도 제한 (선택 사항)
    // controls.minPolarAngle = 0; // Math.PI / 4; // 최소 각도 (아래에서 위로 볼 때)
    // controls.maxPolarAngle = Math.PI; // Math.PI * 3 / 4; // 최대 각도 (위에서 아래로 볼 때)

    return controls;
}

// 다른 파일에서 사용할 수 있도록 함수 내보내기
export { initControls };