// ============================================
// TEENAGE MUTANT CROCODILE NINJA FIGHTERS
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 3;  // Reduced from 5 for smaller steps
const TILE_SIZE = 40;

// Game state
let gameState = 'CHARACTER_SELECT'; // CHARACTER_SELECT, PLAYING, PAUSED, GAME_OVER, VICTORY
let currentLevel = 0;
let selectedCharacter = 0;
let frameCount = 0;
let totalNoodles = 0;

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameState === 'PLAYING') {
        player.attack();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ============================================
// CHARACTERS
// ============================================
const CHARACTERS = [
    { name: 'Rex', color: '#FF4444', weapon: 'staff', bandana: '#FF0000' },
    { name: 'Splash', color: '#4444FF', weapon: 'swords', bandana: '#0000FF' },
    { name: 'Techno', color: '#AA44AA', weapon: 'nunchucks', bandana: '#800080' },
    { name: 'Tanger', color: '#FFAA44', weapon: 'sais', bandana: '#FF8800' }
];

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(x, y, characterIndex) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.facingRight = true;
        this.character = CHARACTERS[characterIndex];
        
        this.maxHealth = 100;
        this.health = 100;
        this.noodles = 0;
        this.lives = 3;
        
        this.attacking = false;
        this.attackTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        
        this.animFrame = 0;
    }
    
    update() {
        // Animation
        this.animFrame++;
        
        // Movement
        if (keys['ArrowLeft']) {
            this.vx = -MOVE_SPEED;
            this.facingRight = false;
        } else if (keys['ArrowRight']) {
            this.vx = MOVE_SPEED;
            this.facingRight = true;
        } else {
            this.vx *= 0.8;
        }
        
        // Jumping (Up arrow)
        if (keys['ArrowUp'] && this.grounded) {
            this.vy = JUMP_FORCE;
            this.grounded = false;
        }
        
        // Apply gravity
        this.vy += GRAVITY;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Check platform collisions
        this.grounded = false;
        for (let platform of currentLevelData.platforms) {
            if (this.checkCollision(platform)) {
                // Landing on top
                if (this.vy > 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
                // Hitting from below
                else if (this.vy < 0 && this.y > platform.y) {
                    this.y = platform.y + platform.height;
                    this.vy = 0;
                }
                // Hitting from side
                else if (this.vx > 0) {
                    this.x = platform.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = platform.x + platform.width;
                    this.vx = 0;
                }
            }
        }
        
        // Screen boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        if (this.y > canvas.height) {
            this.takeDamage(25);
            this.respawn();
        }
        
        // Attack timer
        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attacking = false;
            }
        }
        
        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
        
        // Check noodle collection
        for (let i = currentLevelData.noodles.length - 1; i >= 0; i--) {
            let noodle = currentLevelData.noodles[i];
            if (this.checkCollision(noodle)) {
                this.noodles++;
                if (this.noodles % 10 === 0) {
                    this.lives++;
                }
                currentLevelData.noodles.splice(i, 1);
            }
        }
        
        // Check level exit
        if (currentLevelData.exit && this.checkCollision(currentLevelData.exit)) {
            nextLevel();
        }
    }
    
    checkCollision(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
    
    attack() {
        if (!this.attacking) {
            this.attacking = true;
            this.attackTimer = 15;
            
            // Check enemy hits
            let attackRange = {
                x: this.facingRight ? this.x + this.width : this.x - 40,
                y: this.y,
                width: 40,
                height: this.height
            };
            
            for (let enemy of currentLevelData.enemies) {
                if (!enemy.dead && 
                    attackRange.x < enemy.x + enemy.width &&
                    attackRange.x + attackRange.width > enemy.x &&
                    attackRange.y < enemy.y + enemy.height &&
                    attackRange.y + attackRange.height > enemy.y) {
                    enemy.takeDamage(34);
                }
            }
        }
    }
    
    takeDamage(amount) {
        if (!this.invincible) {
            this.health -= amount;
            this.invincible = true;
            this.invincibleTimer = 60;
            if (this.health <= 0) {
                this.lives--;
                if (this.lives > 0) {
                    this.health = this.maxHealth;
                    this.respawn();
                } else {
                    gameState = 'GAME_OVER';
                }
            }
        }
    }
    
    respawn() {
        this.x = currentLevelData.startX;
        this.y = currentLevelData.startY;
        this.vx = 0;
        this.vy = 0;
    }
    
    draw() {
        // Flicker when invincible
        if (this.invincible && Math.floor(this.animFrame / 4) % 2 === 0) return;
        
        ctx.save();
        
        // Tail (wags when moving)
        let tailWag = Math.abs(this.vx) > 0.1 ? Math.sin(this.animFrame * 0.4) * 8 : 0;
        ctx.fillStyle = '#1a6b1a';
        ctx.beginPath();
        let tailX = this.facingRight ? this.x : this.x + this.width;
        ctx.moveTo(this.x + 4, this.y + 28);
        ctx.lineTo(this.x - 12, this.y + 24 + tailWag);
        ctx.lineTo(this.x - 8, this.y + 32 + tailWag);
        ctx.lineTo(this.x + 4, this.y + 36);
        ctx.fill();
        
        // Body (green crocodile) - wider, more croc-like
        ctx.fillStyle = '#228B22';
        ctx.fillRect(this.x + 2, this.y + 14, 28, 26);
        // Scales on back
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(this.x + 6, this.y + 16, 4, 4);
        ctx.fillRect(this.x + 14, this.y + 18, 4, 4);
        ctx.fillRect(this.x + 22, this.y + 16, 4, 4);
        ctx.fillRect(this.x + 10, this.y + 26, 4, 4);
        ctx.fillRect(this.x + 18, this.y + 28, 4, 4);
        
        // Belly (lighter green)
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(this.x + 8, this.y + 30, 16, 8);
        
        // Head - crocodile snout shape
        ctx.fillStyle = '#228B22';
        // Main head
        ctx.fillRect(this.x + (this.facingRight ? 12 : -4), this.y + 2, 24, 16);
        // Snout extension
        ctx.fillRect(this.x + (this.facingRight ? 28 : -12), this.y + 6, 14, 10);
        
        // Eyes (on top of head like real crocs)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.x + (this.facingRight ? 20 : 4), this.y, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + (this.facingRight ? 22 : 6), this.y + 2, 3, 3);
        // Eyebrow ridge
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(this.x + (this.facingRight ? 18 : 2), this.y - 2, 10, 3);
        
        // Teeth
        ctx.fillStyle = '#FFF';
        for (let i = 0; i < 3; i++) {
            let toothX = this.x + (this.facingRight ? 32 + i * 4 : -6 - i * 4);
            ctx.fillRect(toothX, this.y + 14, 2, 4);
        }
        
        // Nostrils
        ctx.fillStyle = '#0F0';
        ctx.fillRect(this.x + (this.facingRight ? 38 : -8), this.y + 8, 2, 2);
        
        // Bandana (wrapped around neck)
        ctx.fillStyle = this.character.bandana;
        ctx.fillRect(this.x - 2, this.y + 12, 36, 8);
        // Bandana tails that flow when moving
        let tailFlow = this.facingRight ? -1 : 1;
        let tailWave = Math.sin(this.animFrame * 0.3) * 3;
        ctx.fillRect(this.x + (this.facingRight ? -10 : 26), this.y + 14 + tailWave, 10, 5);
        ctx.fillRect(this.x + (this.facingRight ? -8 : 28), this.y + 18 - tailWave, 8, 4);
        
        // WEAPON ATTACK ANIMATIONS
        if (this.attacking) {
            let attackProgress = 1 - (this.attackTimer / 15); // 0 to 1
            
            if (this.character.weapon === 'staff') {
                // Staff sweep animation
                ctx.fillStyle = '#8B4513';
                ctx.save();
                ctx.translate(this.x + (this.facingRight ? 24 : 8), this.y + 20);
                ctx.rotate((this.facingRight ? 1 : -1) * (-Math.PI/3 + attackProgress * Math.PI*1.5));
                ctx.fillRect(-2, -24, 4, 48);
                // Gold tip
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-3, -28, 6, 6);
                ctx.restore();
                
            } else if (this.character.weapon === 'swords') {
                // Dual sword slash
                ctx.fillStyle = '#C0C0C0';
                ctx.save();
                ctx.translate(this.x + (this.facingRight ? 24 : 8), this.y + 18);
                ctx.rotate((this.facingRight ? 1 : -1) * (attackProgress * Math.PI));
                // Sword 1
                ctx.fillRect(0, -20, 4, 28);
                ctx.fillStyle = '#8B0000';
                ctx.fillRect(-2, 4, 8, 4); // handle
                // Sword 2
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(10, -20, 4, 28);
                ctx.fillStyle = '#8B0000';
                ctx.fillRect(8, 4, 8, 4); // handle
                ctx.restore();
                
            } else if (this.character.weapon === 'nunchucks') {
                // Spinning nunchucks
                ctx.fillStyle = '#8B4513';
                let spinAngle = attackProgress * Math.PI * 4;
                let stickX = this.x + (this.facingRight ? 32 : 0);
                let stickY = this.y + 20;
                // Chain
                for (let i = 0; i < 4; i++) {
                    let chainAngle = spinAngle + i * 0.5;
                    let cx = stickX + Math.cos(chainAngle) * (8 + i * 6);
                    let cy = stickY + Math.sin(chainAngle) * 15;
                    ctx.fillStyle = '#444';
                    ctx.fillRect(cx - 2, cy - 2, 4, 4);
                }
                // Main stick
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(stickX - 4, stickY - 3, 8, 6);
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(stickX - 6, stickY - 4, 4, 8);
                // Spinning stick
                let endX = stickX + Math.cos(spinAngle) * 30;
                let endY = stickY + Math.sin(spinAngle) * 20;
                ctx.fillStyle = '#8B4513';
                ctx.save();
                ctx.translate(endX, endY);
                ctx.rotate(spinAngle);
                ctx.fillRect(-4, -3, 10, 6);
                ctx.restore();
                
            } else if (this.character.weapon === 'sais') {
                // Stabbing motion with sais
                ctx.fillStyle = '#C0C0C0';
                let stabOffset = Math.sin(attackProgress * Math.PI) * 20;
                let saiX = this.x + (this.facingRight ? 28 + stabOffset : 4 - stabOffset);
                let saiY = this.y + 16;
                // Main blade
                ctx.fillRect(saiX, saiY - 20, 3, 24);
                // Side prongs
                ctx.beginPath();
                ctx.moveTo(saiX - 1, saiY - 15);
                ctx.lineTo(saiX - 6, saiY - 8);
                ctx.lineTo(saiX - 1, saiY - 8);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(saiX + 4, saiY - 15);
                ctx.lineTo(saiX + 9, saiY - 8);
                ctx.lineTo(saiX + 4, saiY - 8);
                ctx.fill();
                // Handle
                ctx.fillStyle = '#333';
                ctx.fillRect(saiX - 1, saiY, 5, 8);
                // Second sai
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(saiX + 8, saiY - 16, 3, 22);
                ctx.beginPath();
                ctx.moveTo(saiX + 7, saiY - 12);
                ctx.lineTo(saiX + 2, saiY - 6);
                ctx.lineTo(saiX + 7, saiY - 6);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(saiX + 12, saiY - 12);
                ctx.lineTo(saiX + 17, saiY - 6);
                ctx.lineTo(saiX + 12, saiY - 6);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.fillRect(saiX + 7, saiY + 2, 5, 8);
            }
        } else {
            // Weapon at rest
            ctx.fillStyle = '#8B4513';
            if (this.character.weapon === 'staff') {
                ctx.fillRect(this.x + 10, this.y + 4, 3, 28);
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(this.x + 9, this.y + 2, 5, 4);
            } else if (this.character.weapon === 'swords') {
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(this.x + 8, this.y + 6, 2, 18);
                ctx.fillRect(this.x + 12, this.y + 6, 2, 18);
                ctx.fillStyle = '#8B0000';
                ctx.fillRect(this.x + 6, this.y + 20, 10, 3);
            } else if (this.character.weapon === 'nunchucks') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(this.x + 22, this.y + 8, 4, 8);
                ctx.fillRect(this.x + 26, this.y + 10, 3, 6);
            } else if (this.character.weapon === 'sais') {
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(this.x + 22, this.y + 8, 2, 12);
                ctx.fillRect(this.x + 26, this.y + 10, 2, 10);
            }
        }
        
        // Arms
        ctx.fillStyle = '#228B22';
        let armOffset = Math.sin(this.animFrame * 0.2) * 3;
        if (Math.abs(this.vx) > 0.1) {
            ctx.fillRect(this.x + (this.attacking ? 4 : 2), this.y + 18 + armOffset, 6, 10);
            ctx.fillRect(this.x + 24, this.y + 18 - armOffset, 6, 10);
        } else {
            ctx.fillRect(this.x + 4, this.y + 20, 6, 8);
            ctx.fillRect(this.x + 22, this.y + 20, 6, 8);
        }
        
        // Legs (crocodile legs with claws)
        let legOffset = Math.abs(this.vx) > 0.1 ? Math.sin(this.animFrame * 0.3) * 6 : 0;
        ctx.fillStyle = '#228B22';
        // Left leg
        ctx.fillRect(this.x + 4, this.y + 36 + legOffset, 10, 10 - legOffset);
        // Right leg  
        ctx.fillRect(this.x + 18, this.y + 36 - legOffset, 10, 10 + legOffset);
        // Claws
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x + 4, this.y + 44, 2, 4);
        ctx.fillRect(this.x + 8, this.y + 44, 2, 4);
        ctx.fillRect(this.x + 20, this.y + 44, 2, 4);
        ctx.fillRect(this.x + 24, this.y + 44, 2, 4);
        
        ctx.restore();
    }
}

// ============================================
// ENEMY CLASS
// ============================================
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.width = type === 'finalboss' ? 56 : 32;
        this.height = type === 'finalboss' ? 64 : (type === 'boss' ? 56 : 40);
        this.type = type;
        this.vx = (type === 'boss' || type === 'finalboss') ? 0 : 1;
        this.vy = 0;
        this.patrolDistance = 100;
        if (type === 'finalboss') {
            this.health = 300;
        } else if (type === 'boss') {
            this.health = 250;
        } else {
            this.health = 50;
        }
        this.maxHealth = this.health;
        this.dead = false;
        this.animFrame = 0;
        this.attackCooldown = 0;
        this.grounded = false;
        this.groundPoundCooldown = 0;
        this.groundPounding = false;
        this._victoryTriggered = false;
    }
    
    update() {
        if (this.dead) return;
        
        this.animFrame++;
        
        // Patrol behavior for non-boss enemies
        if (this.type !== 'boss' && this.type !== 'finalboss') {
            this.x += this.vx;
            if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                this.vx *= -1;
            }
        }
        
        // Boss behavior (both boss and finalboss types)
        if (this.type === 'boss' || this.type === 'finalboss') {
            if (this.attackCooldown > 0) this.attackCooldown--;
            if (this.groundPoundCooldown > 0) this.groundPoundCooldown--;
            
            let dx = player.x - this.x;
            let isFinal = this.type === 'finalboss';
            let speed = isFinal ? 1.5 : 2.0;
            let meleeRange = isFinal ? 70 : 60;
            let meleeDamage = isFinal ? 25 : 25;
            let meleeCooldown = isFinal ? 90 : 60;
            
            // Ground pound attack
            if (this.groundPoundCooldown === 0 && this.grounded && !this.groundPounding) {
                if (Math.abs(dx) < 200) {
                    this.vy = -10;
                    this.groundPounding = true;
                }
            }
            
            // When landing during ground pound
            if (this.groundPounding && this.grounded) {
                this.groundPounding = false;
                this.groundPoundCooldown = isFinal ? 240 : 180;
                // Shockwave damage
                if (Math.abs(dx) < 120 && Math.abs(player.y - (this.y + this.height)) < 10) {
                    player.takeDamage(20);
                }
            }
            
            // Move toward player slowly
            if (Math.abs(dx) > meleeRange && !this.groundPounding) {
                this.vx = dx > 0 ? speed : -speed;
                this.x += this.vx;
            }
            
            // Melee attack
            if (Math.abs(dx) < meleeRange && this.attackCooldown === 0 && !this.groundPounding) {
                if (Math.abs(player.y - this.y) < 50) {
                    player.takeDamage(meleeDamage);
                    this.attackCooldown = meleeCooldown;
                }
            }
        } else {
            // Regular enemy collision with player
            if (this.checkCollision(player) && !player.invincible) {
                player.takeDamage(15);
            }
        }
        
        // Apply gravity
        this.vy += GRAVITY * 0.5;
        this.y += this.vy;
        
        // Ground collision
        this.grounded = false;
        for (let platform of currentLevelData.platforms) {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height > platform.y &&
                this.y + this.height < platform.y + platform.height + 10) {
                this.y = platform.y - this.height;
                this.vy = 0;
                this.grounded = true;
            }
        }
    }
    
    checkCollision(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        // Knockback
        this.vx = player.facingRight ? 3 : -3;
        this.vy = -3;
        
        if (this.health <= 0) {
            this.dead = true;
            // Drop noodle
            currentLevelData.noodles.push({
                x: this.x + 8,
                y: this.y,
                width: 16,
                height: 16
            });
        }
    }
    
    draw() {
        if (this.dead) return;
        
        ctx.save();
        
        if (this.type === 'finalboss') {
            // Final boss - biggest, throne room
            let angryFinal = this.health < this.maxHealth * 0.5;
            ctx.fillStyle = angryFinal ? '#8a0000' : '#4a0000';
            ctx.fillRect(this.x, this.y, 56, 64);
            
            // Crown
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(this.x + 12, this.y - 10, 32, 10);
            ctx.fillRect(this.x + 8, this.y - 6, 40, 6);
            ctx.fillRect(this.x + 16, this.y - 14, 8, 8);
            ctx.fillRect(this.x + 32, this.y - 14, 8, 8);
            
            // Eyes (glow red, larger)
            ctx.fillStyle = angryFinal ? '#FF6600' : '#FF0000';
            ctx.fillRect(this.x + 8, this.y + 10, 16, 16);
            ctx.fillRect(this.x + 32, this.y + 10, 16, 16);
            
            // Horns
            ctx.fillStyle = '#222';
            ctx.fillRect(this.x - 6, this.y - 12, 14, 20);
            ctx.fillRect(this.x + 48, this.y - 12, 14, 20);
            
            // Spikes on shoulders
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 8, this.y + 20, 8, 12);
            ctx.fillRect(this.x + 56, this.y + 20, 8, 12);
            
            // Health bar
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x, this.y - 24, 56, 8);
            ctx.fillStyle = angryFinal ? '#FF6600' : '#FF0000';
            ctx.fillRect(this.x + 2, this.y - 22, (this.health / this.maxHealth) * 52, 4);
            
        } else if (this.type === 'boss') {
            // Boss - bigger, in temple
            let angry = this.health < this.maxHealth * 0.5;
            ctx.fillStyle = angry ? '#6a00a0' : '#4a0080';
            ctx.fillRect(this.x, this.y, 48, 56);
            
            // Eyes (glow red)
            ctx.fillStyle = angry ? '#FF6600' : '#FF0000';
            ctx.fillRect(this.x + 8, this.y + 8, 12, 12);
            ctx.fillRect(this.x + 28, this.y + 8, 12, 12);
            
            // Horns
            ctx.fillStyle = '#222';
            ctx.fillRect(this.x - 4, this.y - 8, 12, 16);
            ctx.fillRect(this.x + 40, this.y - 8, 12, 16);
            
            // Health bar
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x, this.y - 16, 48, 8);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x + 2, this.y - 14, (this.health / this.maxHealth) * 44, 4);
        } else {
            // Regular enemy
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x + 4, this.y + 8, 24, 24);
            
            // Eyes
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(this.x + 8, this.y + 12, 6, 6);
            ctx.fillRect(this.x + 18, this.y + 12, 6, 6);
            
            // Legs
            let legOffset = Math.sin(this.animFrame * 0.2) * 4;
            ctx.fillRect(this.x + 6, this.y + 32 + legOffset, 8, 8 - legOffset);
            ctx.fillRect(this.x + 18, this.y + 32 - legOffset, 8, 8 + legOffset);
        }
        
        ctx.restore();
    }
}

// ============================================
// LEVEL DATA
// ============================================
const LEVELS = [
    // Level 1: Tutorial - simple platforms, one enemy - CLEAR PATH
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 200, y: 480, width: 150, height: 20 },
            { x: 450, y: 420, width: 150, height: 20 },
            { x: 650, y: 500, width: 150, height: 50 },  // Raised platform for exit
        ],
        enemies: [
            { x: 500, y: 380, type: 'basic' }
        ],
        noodles: [
            { x: 260, y: 440, width: 16, height: 16 },
            { x: 510, y: 380, width: 16, height: 16 },
            { x: 700, y: 460, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: { x: 720, y: 450, width: 40, height: 50 }  // On the raised platform
    },
    // Level 2: Staircase challenge - properly spaced for jumps
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Ground
            { x: 200, y: 480, width: 120, height: 20 },    // Step 1: easy hop
            { x: 380, y: 420, width: 120, height: 20 },    // Step 2: reachable jump (gap ~60px)
            { x: 550, y: 360, width: 120, height: 20 },    // Step 3: reachable jump
            { x: 380, y: 300, width: 120, height: 20 },    // Step 4: go back across
            { x: 200, y: 240, width: 120, height: 20 },    // Step 5: reachable jump
            { x: 50, y: 180, width: 150, height: 20 },     // Step 6: reachable jump
            { x: 600, y: 300, width: 150, height: 20 },    // Side path to exit
        ],
        enemies: [
            { x: 420, y: 380, type: 'basic' },
            { x: 230, y: 200, type: 'basic' }
        ],
        noodles: [
            { x: 250, y: 440, width: 16, height: 16 },
            { x: 430, y: 380, width: 16, height: 16 },
            { x: 600, y: 320, width: 16, height: 16 },
            { x: 430, y: 260, width: 16, height: 16 },
            { x: 250, y: 200, width: 16, height: 16 },
            { x: 100, y: 140, width: 16, height: 16 },
            { x: 660, y: 260, width: 16, height: 16 },
        ],
        startX: 30,
        startY: 480,
        exit: { x: 650, y: 250, width: 40, height: 50 }
    },
    // Level 3: Tower climb - properly spaced platforms
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Ground
            { x: 150, y: 480, width: 120, height: 20 },    // Step 1
            { x: 320, y: 420, width: 120, height: 20 },    // Step 2: gap ~50px
            { x: 490, y: 360, width: 120, height: 20 },    // Step 3: gap ~50px
            { x: 320, y: 300, width: 120, height: 20 },    // Step 4: cross back
            { x: 150, y: 240, width: 120, height: 20 },    // Step 5: gap ~50px
            { x: 320, y: 180, width: 160, height: 20 },    // Step 6: exit platform
        ],
        enemies: [
            { x: 350, y: 380, type: 'basic' },
            { x: 520, y: 320, type: 'basic' },
            { x: 190, y: 200, type: 'basic' }
        ],
        noodles: [
            { x: 200, y: 440, width: 16, height: 16 },
            { x: 370, y: 380, width: 16, height: 16 },
            { x: 540, y: 320, width: 16, height: 16 },
            { x: 370, y: 260, width: 16, height: 16 },
            { x: 200, y: 200, width: 16, height: 16 },
            { x: 390, y: 140, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: { x: 380, y: 130, width: 40, height: 50 }
    },
    // Level 4: The Gauntlet - zigzag run with reachable jumps
    {
        platforms: [
            { x: 0, y: 550, width: 200, height: 50 },      // Start ground
            { x: 250, y: 500, width: 100, height: 20 },    // Step 1: gap ~50px
            { x: 400, y: 450, width: 100, height: 20 },    // Step 2: gap ~50px
            { x: 550, y: 400, width: 120, height: 20 },    // Step 3: gap ~50px
            { x: 400, y: 350, width: 100, height: 20 },    // Step 4: turn back
            { x: 220, y: 300, width: 100, height: 20 },    // Step 5: gap ~80px
            { x: 80, y: 250, width: 100, height: 20 },     // Step 6: gap ~40px
            { x: 250, y: 200, width: 100, height: 20 },    // Step 7: gap ~70px
            { x: 420, y: 200, width: 100, height: 20 },    // Step 8: easy hop
            { x: 600, y: 200, width: 150, height: 20 },    // Exit platform
        ],
        enemies: [
            { x: 270, y: 460, type: 'basic' },
            { x: 570, y: 360, type: 'basic' },
            { x: 280, y: 160, type: 'basic' }
        ],
        noodles: [
            { x: 290, y: 460, width: 16, height: 16 },
            { x: 440, y: 410, width: 16, height: 16 },
            { x: 590, y: 360, width: 16, height: 16 },
            { x: 440, y: 310, width: 16, height: 16 },
            { x: 260, y: 260, width: 16, height: 16 },
            { x: 120, y: 210, width: 16, height: 16 },
            { x: 660, y: 160, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: { x: 650, y: 150, width: 40, height: 50 }
    },
    // Level 5: Boss Temple - fight arena with reachable platforms
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Main floor
            { x: 80, y: 460, width: 140, height: 20 },     // Left platform 1
            { x: 580, y: 460, width: 140, height: 20 },    // Right platform 1
            { x: 200, y: 380, width: 100, height: 20 },    // Left platform 2
            { x: 500, y: 380, width: 100, height: 20 },    // Right platform 2
            { x: 350, y: 320, width: 100, height: 20 },    // Middle boss platform
        ],
        enemies: [
            { x: 370, y: 280, type: 'boss' }
        ],
        noodles: [
            { x: 140, y: 420, width: 16, height: 16 },
            { x: 640, y: 420, width: 16, height: 16 },
            { x: 240, y: 340, width: 16, height: 16 },
            { x: 540, y: 340, width: 16, height: 16 },
            { x: 390, y: 280, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: null // Exit appears after boss defeated
    },
    // Level 6: The Escape - crumbling temple run
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Ground
            { x: 100, y: 480, width: 100, height: 20 },    // Step 1
            { x: 280, y: 420, width: 100, height: 20 },    // Step 2
            { x: 460, y: 370, width: 100, height: 20 },    // Step 3
            { x: 280, y: 320, width: 100, height: 20 },    // Step 4 (go back)
            { x: 100, y: 270, width: 100, height: 20 },    // Step 5
            { x: 300, y: 220, width: 120, height: 20 },    // Step 6
            { x: 550, y: 220, width: 120, height: 20 },    // Step 7
            { x: 680, y: 170, width: 120, height: 20 },    // Exit platform
        ],
        enemies: [
            { x: 310, y: 380, type: 'basic' },
            { x: 130, y: 230, type: 'basic' },
            { x: 580, y: 180, type: 'basic' }
        ],
        noodles: [
            { x: 150, y: 440, width: 16, height: 16 },
            { x: 330, y: 380, width: 16, height: 16 },
            { x: 510, y: 330, width: 16, height: 16 },
            { x: 330, y: 280, width: 16, height: 16 },
            { x: 150, y: 230, width: 16, height: 16 },
            { x: 720, y: 130, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: { x: 730, y: 120, width: 40, height: 50 }
    },
    // Level 7: Shadow Swarm - lots of enemies
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Ground
            { x: 80, y: 480, width: 120, height: 20 },     // Step 1
            { x: 260, y: 440, width: 100, height: 20 },    // Step 2
            { x: 440, y: 400, width: 100, height: 20 },    // Step 3
            { x: 600, y: 360, width: 120, height: 20 },    // Step 4
            { x: 440, y: 320, width: 100, height: 20 },    // Step 5 (go back)
            { x: 260, y: 280, width: 100, height: 20 },    // Step 6
            { x: 80, y: 240, width: 100, height: 20 },     // Step 7
            { x: 250, y: 200, width: 120, height: 20 },    // Step 8
            { x: 500, y: 200, width: 150, height: 20 },    // Exit platform
        ],
        enemies: [
            { x: 300, y: 400, type: 'basic' },
            { x: 460, y: 360, type: 'basic' },
            { x: 300, y: 240, type: 'basic' },
            { x: 120, y: 200, type: 'basic' },
            { x: 550, y: 160, type: 'basic' }
        ],
        noodles: [
            { x: 130, y: 440, width: 16, height: 16 },
            { x: 310, y: 400, width: 16, height: 16 },
            { x: 490, y: 360, width: 16, height: 16 },
            { x: 650, y: 320, width: 16, height: 16 },
            { x: 310, y: 240, width: 16, height: 16 },
            { x: 130, y: 200, width: 16, height: 16 },
            { x: 580, y: 160, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: { x: 600, y: 150, width: 40, height: 50 }
    },
    // Level 8: Final Boss - the ultimate challenge
    {
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },      // Main floor
            { x: 60, y: 460, width: 140, height: 20 },     // Left platform 1
            { x: 600, y: 460, width: 140, height: 20 },    // Right platform 1
            { x: 180, y: 380, width: 120, height: 20 },    // Left platform 2
            { x: 500, y: 380, width: 120, height: 20 },    // Right platform 2
            { x: 320, y: 300, width: 160, height: 20 },    // Middle platform
        ],
        enemies: [
            { x: 350, y: 260, type: 'finalboss' }
        ],
        noodles: [
            { x: 110, y: 420, width: 16, height: 16 },
            { x: 660, y: 420, width: 16, height: 16 },
            { x: 230, y: 340, width: 16, height: 16 },
            { x: 560, y: 340, width: 16, height: 16 },
            { x: 380, y: 260, width: 16, height: 16 },
        ],
        startX: 50,
        startY: 480,
        exit: null // Defeat the final boss to win!
    }
];

let currentLevelData = null;
let player = null;

// ============================================
// INITIALIZATION
// ============================================
function initLevel(levelIndex) {
    currentLevel = levelIndex;
    const level = LEVELS[levelIndex];
    
    // Save noodles before resetting
    if (player) {
        totalNoodles += player.noodles;
    }
    
    currentLevelData = {
        platforms: [...level.platforms],
        enemies: level.enemies.map(e => new Enemy(e.x, e.y, e.type)),
        noodles: [...level.noodles],
        startX: level.startX,
        startY: level.startY,
        exit: level.exit
    };
    
    player = new Player(level.startX, level.startY, selectedCharacter);
    player.noodles = totalNoodles;
}

function nextLevel() {
    if (currentLevel < LEVELS.length - 1) {
        initLevel(currentLevel + 1);
    } else {
        gameState = 'VICTORY';
    }
}

function restartGame() {
    currentLevel = 0;
    totalNoodles = 0;
    gameState = 'CHARACTER_SELECT';
}

// ============================================
// RENDERING
// ============================================
function drawPixelText(text, x, y, size = 20, color = '#FFF') {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}

function drawCharacterSelect() {
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    drawPixelText('TEENAGE MUTANT CROCODILE', canvas.width / 2, 60, 32, '#FFD700');
    drawPixelText('NINJA FIGHTERS', canvas.width / 2, 100, 32, '#FFD700');
    
    drawPixelText('Choose Your Character!', canvas.width / 2, 160, 24, '#FFF');
    
    // Character boxes
    for (let i = 0; i < CHARACTERS.length; i++) {
        let x = 100 + i * 180;
        let y = 220;
        let char = CHARACTERS[i];
        
        // Selection highlight
        if (i === selectedCharacter) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 10, y - 10, 160, 260);
        }
        
        // Box
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(x, y, 140, 240);
        
        // Tail
        ctx.fillStyle = '#1a6b1a';
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 100);
        ctx.lineTo(x + 15, y + 95);
        ctx.lineTo(x + 20, y + 110);
        ctx.lineTo(x + 40, y + 115);
        ctx.fill();
        
        // Character preview (pixel art style crocodile)
        // Body
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x + 35, y + 85, 50, 45);
        // Scales
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(x + 42, y + 90, 6, 6);
        ctx.fillRect(x + 55, y + 95, 6, 6);
        ctx.fillRect(x + 68, y + 90, 6, 6);
        
        // Belly
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(x + 45, y + 115, 30, 12);
        
        // Head with snout
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x + 55, y + 55, 45, 35);
        ctx.fillRect(x + 90, y + 65, 25, 20);
        
        // Eyes (on top)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x + 70, y + 50, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 72, y + 52, 4, 4);
        // Eyebrow
        ctx.fillStyle = '#1a6b1a';
        ctx.fillRect(x + 65, y + 47, 18, 4);
        
        // Teeth
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x + 95, y + 82, 3, 5);
        ctx.fillRect(x + 102, y + 82, 3, 5);
        ctx.fillRect(x + 109, y + 82, 3, 5);
        
        // Nostrils
        ctx.fillStyle = '#0F0';
        ctx.fillRect(x + 110, y + 70, 3, 3);
        
        // Bandana
        ctx.fillStyle = char.bandana;
        ctx.fillRect(x + 45, y + 78, 60, 10);
        ctx.fillRect(x + 30, y + 80, 18, 6);
        ctx.fillRect(x + 32, y + 85, 12, 5);
        
        // Weapon preview
        ctx.fillStyle = '#8B4513';
        if (char.weapon === 'staff') {
            ctx.fillRect(x + 50, y + 55, 4, 35);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x + 48, y + 52, 8, 6);
        } else if (char.weapon === 'swords') {
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(x + 48, y + 60, 3, 20);
            ctx.fillRect(x + 55, y + 60, 3, 20);
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(x + 45, y + 78, 16, 4);
        } else if (char.weapon === 'nunchucks') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 85, y + 75, 5, 10);
            ctx.fillRect(x + 92, y + 78, 4, 8);
        } else if (char.weapon === 'sais') {
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(x + 85, y + 70, 3, 15);
            ctx.fillRect(x + 90, y + 73, 3, 12);
        }
        
        // Legs with claws
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x + 40, y + 130, 12, 15);
        ctx.fillRect(x + 70, y + 130, 12, 15);
        ctx.fillStyle = '#444';
        ctx.fillRect(x + 40, y + 142, 3, 5);
        ctx.fillRect(x + 46, y + 142, 3, 5);
        ctx.fillRect(x + 72, y + 142, 3, 5);
        ctx.fillRect(x + 78, y + 142, 3, 5);
        
        // Name
        drawPixelText(char.name, x + 70, y + 185, 20, char.bandana);
        
        // Weapon
        drawPixelText(char.weapon, x + 70, y + 215, 14, '#AAA');
    }
    
    drawPixelText('Press SPACE to Start!', canvas.width / 2, 520, 20, '#FFD700');
}

function drawHUD() {
    // Health bar
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 10, 204, 24);
    ctx.fillStyle = '#444';
    ctx.fillRect(12, 12, 200, 20);
    ctx.fillStyle = player.health > 50 ? '#0F0' : player.health > 25 ? '#FF0' : '#F00';
    ctx.fillRect(12, 12, (player.health / player.maxHealth) * 200, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${player.health}`, 16, 26);
    
    // Lives
    drawPixelText(`Lives: ${player.lives}`, canvas.width - 100, 26, 16, '#FFF');
    
    // Noodles
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(canvas.width / 2 - 50, 12, 16, 16);
    drawPixelText(`x ${player.noodles}`, canvas.width / 2 + 10, 26, 16, '#FFD700');
    
    // Level
    drawPixelText(`Level ${currentLevel + 1}/8`, canvas.width / 2, 55, 16, '#FFF');
}

function drawGame() {
    // Clear with level-appropriate background
    let bgColor = '#87CEEB';
    if (currentLevel === 4 || currentLevel === 5) bgColor = '#2a1a3a';
    else if (currentLevel === 6) bgColor = '#1a2a1a';
    else if (currentLevel === 7) bgColor = '#2a1a1a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Level decorations
    if (currentLevel === 4) {
        // Temple decorations for boss level
        ctx.fillStyle = '#1a0a2a';
        ctx.fillRect(0, 0, 50, canvas.height);
        ctx.fillRect(canvas.width - 50, 0, 50, canvas.height);
        ctx.fillStyle = '#4a0080';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(60, 100 + i * 100, 20, 60);
            ctx.fillRect(canvas.width - 80, 100 + i * 100, 20, 60);
        }
    } else if (currentLevel === 5) {
        // Crumbling temple - cracked pillars
        ctx.fillStyle = '#1a0a2a';
        ctx.fillRect(0, 0, 40, canvas.height);
        ctx.fillRect(canvas.width - 40, 0, 40, canvas.height);
        ctx.fillStyle = '#4a3030';
        let sway = Math.sin(frameCount * 0.02) * 3;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(50 + sway, 120 + i * 130, 16, 50);
            ctx.fillRect(canvas.width - 66 - sway, 120 + i * 130, 16, 50);
        }
    } else if (currentLevel === 6) {
        // Shadow forest - creepy trees
        ctx.fillStyle = '#0a1a0a';
        for (let i = 0; i < 6; i++) {
            let tx = 60 + i * 130;
            let sway = Math.sin(frameCount * 0.01 + i) * 4;
            ctx.fillRect(tx + sway, 100, 20, canvas.height - 100);
            ctx.fillRect(tx - 10 + sway, 80, 40, 30);
        }
    } else if (currentLevel === 7) {
        // Final throne room - pillars of fire
        ctx.fillStyle = '#1a0a0a';
        for (let i = 0; i < 5; i++) {
            let px = 30 + i * 180;
            ctx.fillRect(px, 0, 15, canvas.height);
            // Fire glow
            ctx.fillStyle = `rgba(255, 100, 0, ${0.3 + Math.sin(frameCount * 0.05 + i) * 0.15})`;
            ctx.fillRect(px - 5, 0, 25, canvas.height);
            ctx.fillStyle = '#1a0a0a';
        }
    } else {
        // Clouds for regular levels
        ctx.fillStyle = '#FFF';
        ctx.fillRect(100 + Math.sin(frameCount * 0.01) * 20, 80, 80, 30);
        ctx.fillRect(500 + Math.sin(frameCount * 0.015) * 20, 120, 100, 40);
    }
    
    // Platforms
    let platformColor = '#8B4513';
    let grassColor = '#228B22';
    if (currentLevel === 4) { platformColor = '#3a2a4a'; grassColor = '#5a4a6a'; }
    else if (currentLevel === 5) { platformColor = '#3a2a3a'; grassColor = '#5a3a3a'; }
    else if (currentLevel === 6) { platformColor = '#2a3a2a'; grassColor = '#3a5a3a'; }
    else if (currentLevel === 7) { platformColor = '#3a2a2a'; grassColor = '#5a3a3a'; }
    
    ctx.fillStyle = platformColor;
    for (let platform of currentLevelData.platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = grassColor;
        ctx.fillRect(platform.x, platform.y, platform.width, 6);
        ctx.fillStyle = platformColor;
    }
    
    // Exit door
    if (currentLevelData.exit) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(currentLevelData.exit.x, currentLevelData.exit.y, 
                     currentLevelData.exit.width, currentLevelData.exit.height);
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(currentLevelData.exit.x + 5, currentLevelData.exit.y + 5, 
                     currentLevelData.exit.width - 10, currentLevelData.exit.height - 10);
    }
    
    // Noodles
    for (let noodle of currentLevelData.noodles) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(noodle.x + 4, noodle.y + 4, 8, 8);
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(noodle.x + 2, noodle.y + 2, 12, 4);
    }
    
    // Enemies
    for (let enemy of currentLevelData.enemies) {
        enemy.draw();
    }
    
    // Player
    player.draw();
    
    // Attack effect
    if (player.attacking) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        let ax = player.facingRight ? player.x + player.width : player.x - 40;
        ctx.fillRect(ax, player.y, 40, player.height);
    }
    
    // HUD
    drawHUD();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawPixelText('GAME OVER', canvas.width / 2, 250, 48, '#FF0000');
    drawPixelText('Press SPACE to Try Again', canvas.width / 2, 320, 20, '#FFF');
}

function drawVictory() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawPixelText('YOU WIN!', canvas.width / 2, 180, 48, '#FFD700');
    drawPixelText('You defeated the evil bosses', canvas.width / 2, 230, 20, '#FFF');
    drawPixelText('and saved the city!', canvas.width / 2, 260, 20, '#FFF');
    drawPixelText(`Total Noodles: ${player.noodles}`, canvas.width / 2, 310, 24, '#FFD700');
    drawPixelText('You are a true ninja crocodile!', canvas.width / 2, 360, 18, '#90EE90');
    drawPixelText('Press SPACE to Play Again', canvas.width / 2, 420, 20, '#FFF');
}

// ============================================
// MAIN GAME LOOP
// ============================================
function update() {
    frameCount++;
    
    if (gameState === 'PLAYING') {
        player.update();
        
        for (let enemy of currentLevelData.enemies) {
            enemy.update();
        }
        
        // Check boss defeat (spawn exit or trigger victory)
        let bossEnemy = currentLevelData.enemies.find(e => e.type === 'boss' || e.type === 'finalboss');
        if (bossEnemy && bossEnemy.dead && !bossEnemy._victoryTriggered) {
            bossEnemy._victoryTriggered = true;
            if (currentLevel === LEVELS.length - 1) {
                setTimeout(() => { gameState = 'VICTORY'; }, 1000);
            } else if (!currentLevelData.exit) {
                // Spawn exit on the right platform
                currentLevelData.exit = { x: 660, y: 410, width: 40, height: 50 };
            }
        }
    }
}

function draw() {
    if (gameState === 'CHARACTER_SELECT') {
        drawCharacterSelect();
    } else if (gameState === 'PLAYING') {
        drawGame();
    } else if (gameState === 'GAME_OVER') {
        drawGame();
        drawGameOver();
    } else if (gameState === 'VICTORY') {
        drawGame();
        drawVictory();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Input for menus
document.addEventListener('keydown', (e) => {
    if (gameState === 'CHARACTER_SELECT') {
        if (e.code === 'ArrowLeft') {
            selectedCharacter = (selectedCharacter - 1 + CHARACTERS.length) % CHARACTERS.length;
        } else if (e.code === 'ArrowRight') {
            selectedCharacter = (selectedCharacter + 1) % CHARACTERS.length;
        } else if (e.code === 'Space') {
            initLevel(0);
            gameState = 'PLAYING';
        }
    } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
        if (e.code === 'Space') {
            restartGame();
        }
    }
});

// Start the game
drawCharacterSelect();
gameLoop();
