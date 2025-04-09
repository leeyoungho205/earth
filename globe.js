import * as THREE from 'three';
import { initControls } from './controls.js';
import Constellation from './constellations.js';

function initGlobe() {
    // 1. Scene 생성
    const scene = new THREE.Scene();

    // 2. Camera 생성
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // 3. Renderer 생성
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "low-power" // GPU 전력 소비 최적화
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 고해상도 디스플레이에서의 메모리 사용 제한
    document.body.appendChild(renderer.domElement);

    // 텍스처 로더 생성
    const textureLoader = new THREE.TextureLoader();

    // 4. 지구 생성 (Blue Marble 텍스처 사용)
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthTexture = textureLoader.load(
        'img/earth-blue-marble.jpg',
        (texture) => {
            console.log('텍스처 로딩 성공');
            earthMaterial.needsUpdate = true;
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% 로딩됨');
        },
        (err) => {
            console.error('텍스처 로딩 에러:', err);
            // 에러 발생 시 기본 색상으로 대체
            earthMaterial.color.set(0x1a75ff);
            earthMaterial.needsUpdate = true;
        }
    );
    
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // 5. 조명 추가
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // 6. 마우스 컨트롤 초기화
    const controls = initControls(camera, renderer.domElement);

    // 별자리 객체 생성
    let constellation = new Constellation(scene);

    // 더블클릭 이벤트 설정
    const raycaster = new THREE.Raycaster();

    // 더블클릭 이벤트 추가
    renderer.domElement.addEventListener('dblclick', (event) => {
        // 마우스 좌표를 정규화 (-1 ~ +1)
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // 레이캐스터 업데이트
        raycaster.setFromCamera(mouse, camera);

        // 지구본과의 교차점 계산
        const intersects = raycaster.intersectObject(earthMesh);

        if (intersects.length > 0) {
            // 교차점의 3D 좌표를 가져옴
            const intersectionPoint = intersects[0].point;
            const normal = intersects[0].face.normal.clone();
            console.log('클릭된 위치:', intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);

            // 기존 별자리와 막대 제거
            if (constellation) {
                constellation.hide();
            }
            if (window.previousLine) {
                scene.remove(window.previousLine);
                window.previousLine = null;
            }
            
            // 새로운 별자리 객체 생성
            constellation = new Constellation(scene);
            
            // 새로운 위치에 별자리 표시
            constellation.setCenter(intersectionPoint);
            constellation.show();

            // 노란 막대 생성
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                intersectionPoint,
                intersectionPoint.clone().add(normal.multiplyScalar(0.3)) // 길이 0.3의 막대
            ]);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xFFFF00,
                linewidth: 2
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            scene.add(line);
            window.previousLine = line;
        }
    });

    // 7. 창 크기 변경 시 처리
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize, false);

    // 정리 함수
    const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('dblclick', (event) => {
            // 마우스 좌표를 정규화 (-1 ~ +1)
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            // 레이캐스터 업데이트
            raycaster.setFromCamera(mouse, camera);

            // 지구본과의 교차점 계산
            const intersects = raycaster.intersectObject(earthMesh);

            if (intersects.length > 0) {
                // 교차점의 3D 좌표를 가져옴
                const intersectionPoint = intersects[0].point;
                const normal = intersects[0].face.normal.clone();
                console.log('클릭된 위치:', intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);

                // 기존 별자리 제거
                constellation.hide();
                
                // 새로운 위치에 별자리 표시
                constellation.setCenter(intersectionPoint);
                constellation.show();

                // 노란 막대 생성
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    intersectionPoint,
                    intersectionPoint.clone().add(normal.multiplyScalar(0.3)) // 길이 0.3의 막대
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00 });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);

                // 이전 막대 제거
                if (window.previousLine) {
                    scene.remove(window.previousLine);
                }
                window.previousLine = line;
            }
        });
        constellation.hide();
        scene.remove(earthMesh);
        earthGeometry.dispose();
        earthMaterial.dispose();
        earthTexture.dispose();
        renderer.dispose();
    };

    return { scene, camera, renderer, earthMesh, controls, cleanup };
}

// 애니메이션 루프 함수
function animate(scene, camera, renderer, controls) {
    function render() {
        requestAnimationFrame(render);
        controls.update();
        renderer.render(scene, camera);
    }
    render();
}

export { initGlobe, animate };