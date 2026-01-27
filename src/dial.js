export class Dial {
    constructor(container) {
        this.container = container;
        this.angle = 90;
        this.isDragging = false;
        this.targetAngle = 90;
        this.coverVisible = true;
        this.locked = false;
    }

    randomizeTarget() {
        this.targetAngle = Math.random() * 180;
    }

    hideCover() {
        this.coverVisible = false;
        const cover = this.container.querySelector('#dial-cover');
        if (cover) {
            cover.style.opacity = '0';
            cover.style.pointerEvents = 'none';
        }
    }

    showCover() {
        this.coverVisible = true;
        const cover = this.container.querySelector('#dial-cover');
        if (cover) {
            cover.style.opacity = '1';
            cover.style.pointerEvents = 'auto';
        }
    }

    lock() {
        this.locked = true;
        const knob = this.container.querySelector('#dial-knob');
        const pointer = this.container.querySelector('#dial-pointer');
        if (knob) knob.style.cursor = 'not-allowed';
        if (pointer) pointer.style.cursor = 'not-allowed';
    }

    unlock() {
        this.locked = false;
        const knob = this.container.querySelector('#dial-knob');
        const pointer = this.container.querySelector('#dial-pointer');
        if (knob) knob.style.cursor = 'grab';
        if (pointer) pointer.style.cursor = 'grab';
    }

    render() {
        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        const createWedge = (startAngle, endAngle) => {
            const offset = this.targetAngle - 90;
            const adjustedStart = startAngle + offset;
            const adjustedEnd = endAngle + offset;
            const start = polarToCartesian(350, 350, 300, adjustedEnd);
            const end = polarToCartesian(350, 350, 300, adjustedStart);
            const largeArcFlag = adjustedEnd - adjustedStart <= 180 ? "0" : "1";
            return `M 350 350 L ${start.x} ${start.y} A 300 300 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
        };

        this.container.innerHTML = `
        <svg width="800" height="450" viewBox="0 0 700 380" class="dial-svg">
            <defs>
                <clipPath id="dial-clip">
                    <path d="M 50 350 A 300 300 0 0 1 650 350 L 650 350 L 50 350 Z"/>
                </clipPath>
            </defs>
            
            <path d="M 50 350 A 300 300 0 0 1 650 350 Z" 
                  fill="#f5f5dc" 
                  stroke="none"/>
            
            <g clip-path="url(#dial-clip)">
                <path d="${createWedge(-10, -6)}" 
                      fill="#fcbf49" 
                      stroke="none"/>
                
                <path d="${createWedge(-6, -2)}" 
                      fill="#f77f00" 
                      stroke="none"/>
                
                <path d="${createWedge(-2, 2)}" 
                      fill="#457b9d" 
                      stroke="none"/>
                
                <path d="${createWedge(2, 6)}" 
                      fill="#f77f00" 
                      stroke="none"/>
                
                <path d="${createWedge(6, 10)}" 
                      fill="#fcbf49" 
                      stroke="none"/>
            </g>
            
            <path id="dial-cover" d="M 50 350 A 300 300 0 0 1 650 350 Z" 
                  fill="#4ecdc4" 
                  stroke="none"
                  style="transition: opacity 0.15s ease;"/>
            
            <path d="M 50 350 A 300 300 0 0 1 650 350" 
                  fill="none" 
                  stroke="#00165c" 
                  stroke-width="35"/>
            
            <line id="dial-pointer" 
                  x1="350" y1="350" 
                  x2="350" y2="80" 
                  stroke="#e63946" 
                  stroke-width="6" 
                  stroke-linecap="round"/>
            
            <circle cx="350" cy="350" r="35" fill="#00165c"/>
            
            <circle id="dial-knob" 
                    cx="350" cy="350" 
                    r="26" 
                    fill="#e63946" 
                    cursor="grab"/>
        </svg>
    `;

        this.setupInteraction();
        this.updatePointer();

        if (!this.coverVisible) {
            this.hideCover();
        }
    }

    setupInteraction() {
        const knob = this.container.querySelector('#dial-knob');
        const pointer = this.container.querySelector('#dial-pointer');

        const startDragging = (e) => {
            this.isDragging = true;
            knob.style.cursor = 'grabbing';
            e.preventDefault();
        };

        knob.addEventListener('mousedown', startDragging);
        pointer.addEventListener('mousedown', startDragging);
        pointer.style.cursor = 'grab';

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                knob.style.cursor = 'grab';
                pointer.style.cursor = 'grab';
            }
        });
    }

    handleDrag(e) {
        if (this.locked) return;

        const svg = this.container.querySelector('.dial-svg');
        const rect = svg.getBoundingClientRect();

        const scaleX = rect.width / 700;
        const scaleY = rect.height / 380;

        const centerX = rect.left + 350 * scaleX;
        const centerY = rect.top + 350 * scaleY;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        let angleRad = Math.atan2(-mouseY, mouseX);
        let angleDeg = angleRad * (180 / Math.PI);

        if (angleDeg < 0) {
            angleDeg += 360;
        }

        angleDeg = 180 - angleDeg;

        if (angleDeg < 0) {
            angleDeg += 360;
        }

        if (angleDeg > 180 && angleDeg < 270) {
            angleDeg = 180;
        } else if (angleDeg >= 270) {
            angleDeg = 0;
        }

        if (angleDeg < 0) angleDeg = 0;
        if (angleDeg > 180) angleDeg = 180;

        this.angle = angleDeg;
        this.updatePointer();
    }

    updatePointer() {
        const pointer = this.container.querySelector('#dial-pointer');
        const knob = this.container.querySelector('#dial-knob');

        if (!pointer || !knob) return;

        const mathAngle = 180 - this.angle;
        const radians = (mathAngle * Math.PI) / 180;

        const arcRadius = 300;
        const centerX = 350;
        const centerY = 350;
        const pointerEndX = centerX + Math.cos(radians) * arcRadius;
        const pointerEndY = centerY - Math.sin(radians) * arcRadius;

        pointer.setAttribute('x1', centerX);
        pointer.setAttribute('y1', centerY);
        pointer.setAttribute('x2', pointerEndX);
        pointer.setAttribute('y2', pointerEndY);

        knob.setAttribute('cx', centerX);
        knob.setAttribute('cy', centerY);
    }
}