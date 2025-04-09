// earthquakeMarkers.js
import * as THREE from 'three';
const BASE_MARKER_RADIUS = 0.0025;
const MAGNITUDE_SCALE_FACTOR = 0.0015;
const MAX_MARKERS = 2000; // 최대 표시할 지진 마커 개수
//const MIN_MAGNITUDE = 6.0;

// 경도 보정을 위한 회전 각도 (기본값 0)
let longitudeOffset = 90;

// 경도 보정 각도 설정 함수
export function setLongitudeOffset(offset) {
    longitudeOffset = offset;
}

// --- 위도, 경도를 3D 좌표로 변환하는 함수 (Z축 기준) ---
function latLonToVector3(latitude, longitude, radius) {
    // 1. 위도/경도를 라디안으로 변환
    const latRad = THREE.MathUtils.degToRad(latitude);
    // 경도에 보정 각도 추가
    const lonRad = THREE.MathUtils.degToRad(longitude + longitudeOffset);

    // 2. 데카르트 좌표(x, y, z) 계산
    // 가정: 경도 0° (본초 자오선)가 +Z 축에 정렬됨
    const r = radius + 0.001; // 표면보다 약간 위

    const x = r * Math.cos(latRad) * Math.sin(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.cos(lonRad);

    return new THREE.Vector3(x, y, z);
}

// --- 지진 마커 생성 함수 (변경 없음, 수정된 latLonToVector3 사용) ---
function createEarthquakeMarkers(data, earthMesh) {
    if (!data || !Array.isArray(data) || !earthMesh) return null;

    const group = new THREE.Group();
    group.name = "EarthquakeMarkersGroup";

    const markerGeometry = new THREE.CircleGeometry(1, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    const earthRadius = earthMesh.geometry.parameters.radius;

    // 데이터를 규모순으로 정렬하고 최대 개수만큼만 선택
    const sortedData = [...data].sort((a, b) => b.magnitude - a.magnitude).slice(0, MAX_MARKERS);

    sortedData.forEach(quake => {
        const markerRadius = BASE_MARKER_RADIUS + Math.max(0, quake.magnitude - 6) * MAGNITUDE_SCALE_FACTOR;

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        // 1. 위치 설정 (새로운 latLonToVector3 함수 사용)
        const position = latLonToVector3(quake.latitude, quake.longitude, earthRadius);
        marker.position.copy(position);

        // 2. 크기 설정
        marker.scale.set(markerRadius, markerRadius, markerRadius);

        // 3. 방향 설정 (지구 로컬 중심 바라보기)
        marker.lookAt(new THREE.Vector3(0, 0, 0));

        marker.userData = quake;
        group.add(marker);
    });

    return group;
}

// 함수 내보내기
export { createEarthquakeMarkers };