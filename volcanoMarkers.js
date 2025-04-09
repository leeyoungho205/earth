import * as THREE from 'three';

const BASE_MARKER_RADIUS = 0.006; // 지진 마커보다 약간 크게 (0.003에서 0.006으로 증가)
const MAGNITUDE_SCALE_FACTOR = 0.0015;

// 경도 보정을 위한 회전 각도 (기본값 90)
let longitudeOffset = 90;

// 경도 보정 각도 설정 함수
export function setLongitudeOffset(offset) {
    longitudeOffset = offset;
}

// --- 위도, 경도를 3D 좌표로 변환하는 함수 (Z축 기준) ---
function latLonToVector3(latitude, longitude, radius) {
    const latRad = THREE.MathUtils.degToRad(latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude + longitudeOffset);

    const r = radius + 0.001;

    const x = r * Math.cos(latRad) * Math.sin(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.cos(lonRad);

    return new THREE.Vector3(x, y, z);
}

// --- 화산 마커 생성 함수 ---
function createVolcanoMarkers(data, earthMesh) {
    if (!data || !Array.isArray(data) || !earthMesh) return null;

    const group = new THREE.Group();
    group.name = "VolcanoMarkersGroup";

    const markerGeometry = new THREE.CircleGeometry(1, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700, // 황금색으로 변경
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8, // 불투명도 증가
        depthWrite: false,
        blending: THREE.AdditiveBlending // 가시성 향상을 위해 AdditiveBlending 사용
    });

    const earthRadius = earthMesh.geometry.parameters.radius;

    data.forEach(volcano => {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        // 위치 설정
        const position = latLonToVector3(volcano.latitude, volcano.longitude, earthRadius);
        marker.position.copy(position);

        // 크기 설정 (화산대는 크기 변화 없음)
        marker.scale.set(BASE_MARKER_RADIUS, BASE_MARKER_RADIUS, BASE_MARKER_RADIUS);

        // 방향 설정 (지구 로컬 중심 바라보기)
        marker.lookAt(new THREE.Vector3(0, 0, 0));

        marker.userData = volcano;
        group.add(marker);
    });

    return group;
}

// CSV 파일을 읽어서 화산 데이터를 파싱하는 함수
export async function loadVolcanoData() {
    try {
        const response = await fetch('/data/volcanoes.csv');
        const csvText = await response.text();
        
        // CSV 파싱
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        const volcanoes = lines.slice(1).map(line => {
            const values = line.split(',');
            return {
                name: values[0],
                latitude: parseFloat(values[1]),
                longitude: parseFloat(values[2]),
                // 필요한 경우 추가 데이터 필드 추가
            };
        }).filter(volcano => !isNaN(volcano.latitude) && !isNaN(volcano.longitude));

        return volcanoes;
    } catch (error) {
        console.error('화산 데이터 로딩 실패:', error);
        return [];
    }
}

// 함수 내보내기
export { createVolcanoMarkers }; 