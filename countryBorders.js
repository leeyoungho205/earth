import * as THREE from 'three';

// 경도 보정을 위한 회전 각도 (기본값 90)
let longitudeOffset = 90;

// 경도 보정 각도 설정 함수
export function setLongitudeOffset(offset) {
    longitudeOffset = offset;
}

// 위도, 경도를 3D 좌표로 변환하는 함수
function latLonToVector3(latitude, longitude, radius) {
    const latRad = THREE.MathUtils.degToRad(latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude + longitudeOffset);

    const r = radius + 0.001;

    const x = r * Math.cos(latRad) * Math.sin(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.cos(lonRad);

    return new THREE.Vector3(x, y, z);
}

// 국가 경계선 생성 함수
export function createCountryBorders(data, earthMesh) {
    if (!data || !earthMesh) {
        console.error('국가 경계선 생성에 필요한 데이터가 없습니다.');
        return null;
    }

    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        opacity: 0.3,
        transparent: true
    });

    data.forEach(country => {
        if (!country.geometry) return;

        const coordinates = country.geometry.coordinates;
        if (!coordinates) return;

        if (country.geometry.type === 'MultiPolygon') {
            coordinates.forEach(polygon => {
                createPolygon(polygon[0], group, material, earthMesh);
            });
        } else if (country.geometry.type === 'Polygon') {
            createPolygon(coordinates[0], group, material, earthMesh);
        }
    });

    return group;
}

function createPolygon(coordinates, group, material, earthMesh) {
    const points = coordinates.map(coord => {
        const [lon, lat] = coord;
        return latLonToVector3(lat, lon, earthMesh.geometry.parameters.radius + 0.001);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
}

// GeoJSON 데이터 로드 함수
export async function loadCountryData() {
    try {
        console.log('world_countries.json 파일을 로드하는 중...');
        const response = await fetch('/world_countries.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('데이터 로드 완료:', data);
        
        if (!data || !data.features) {
            throw new Error('GeoJSON 데이터 형식이 올바르지 않습니다.');
        }
        
        console.log(`${data.features.length}개의 국가 데이터가 로드되었습니다.`);
        return data.features;
    } catch (error) {
        console.error('국가 데이터 로드 중 오류 발생:', error);
        throw error; // 에러를 상위로 전파하여 처리할 수 있도록 함
    }
} 