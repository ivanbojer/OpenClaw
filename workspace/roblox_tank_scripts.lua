
--[[

    ROBLOX TANK ARTILLERY SCRIPT by DJLoky
    
    This file contains two scripts:
    1. TankController: Manages aiming and firing the tank.
    2. Projectile: Handles the shell's behavior after being fired.

    -------------------------------------------------
    -- INSTRUCTIONS
    -------------------------------------------------

    1.  **Build the Tank:**
        - Create a simple tank model. It can be a few `Part` blocks.
        - Make sure the following parts exist and are named correctly:
            - `TankBase`: The main body of the tank.
            - `Turret`: A part on top of the base that will rotate left and right.
            - `Barrel`: A part connected to the Turret that will pivot up and down.
            - `FireButton`: A small part on the tank you can click to fire.
        - Group all these parts into a single `Model` and name it `Tank`.

    2.  **Create the Projectile:**
        - In `ReplicatedStorage`, create a `Part` and name it `TankShell`. This will be our projectile.
        - You can customize its shape, color, and size.

    3.  **Create the Target:**
        - Somewhere in the `Workspace`, place a `Part` and name it `Target`. Make it stand out.

    4.  **Install the Scripts:**

        - **Script 1: TankController**
            - Inside the `Tank` model, add a new `Script`.
            - Name it `TankController`.
            - Copy and paste the code from `--- SCRIPT 1: TANK CONTROLLER ---` into it.

        - **Script 2: Projectile**
            - Inside the `TankShell` part in `ReplicatedStorage`, add a new `Script`.
            - Name it `Projectile`.
            - Copy and paste the code from `--- SCRIPT 2: PROJECTILE ---` into it.

    5.  **Run the Game:**
        - Hit Play.
        - Use the `A` and `D` keys to rotate the turret.
        - Use the `W` and `S` keys to change the barrel's angle.
        - Click the `FireButton` on the tank to shoot.

]]

--- SCRIPT 1: TANK CONTROLLER ---
-- This script goes inside the main Tank model.

-- Services
local UserInputService = game:GetService("UserInputService")

-- Tank Parts
local tank = script.Parent
local base = tank:WaitForChild("TankBase")
local turret = tank:WaitForChild("Turret")
local barrel = tank:WaitForChild("Barrel")
local fireButton = tank:WaitForChild("FireButton")

-- Projectile Template
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local tankShellTemplate = ReplicatedStorage:WaitForChild("TankShell")

-- Configuration
local firePower = 200       -- How fast the shell is launched
local turnSpeed = 1         -- How fast the turret turns (degrees per frame)
local angleSpeed = 1        -- How fast the barrel pivots (degrees per frame)
local minAngle = -10        -- The lowest the barrel can aim (degrees)
local maxAngle = 45         -- The highest the barrel can aim (degrees)
local reloadTime = 2        -- Seconds between shots

-- Internal State
local canFire = true
local currentBarrelAngle = 0
local keys = {
    turretLeft = false,
    turretRight = false,
    barrelUp = false,
    barrelDown = false
}

-- Create a HingeConstraint for the barrel pivot
local barrelHinge = Instance.new("HingeConstraint")
barrelHinge.Parent = turret
barrelHinge.Attachment0 = Instance.new("Attachment", turret)
barrelHinge.Attachment1 = Instance.new("Attachment", barrel)
barrelHinge.Attachment0.Orientation = Vector3.new(0, 0, -90)
barrelHinge.Attachment1.Orientation = Vector3.new(0, 0, -90)
barrelHinge.ActuatorType = Enum.ActuatorType.Servo
barrelHinge.ServoMaxTorque = 100000
barrelHinge.LimitsEnabled = true
barrelHinge.LowerAngle = minAngle
barrelHinge.UpperAngle = maxAngle
barrelHinge.TargetAngle = 0

-- Create a HingeConstraint for the turret rotation
local turretHinge = Instance.new("HingeConstraint")
turretHinge.Parent = base
turretHinge.Attachment0 = Instance.new("Attachment", base)
turretHinge.Attachment1 = Instance.new("Attachment", turret)
turretHinge.ActuatorType = Enum.ActuatorType.Motor
turretHinge.MotorMaxTorque = 100000
turretHinge.AngularVelocity = 0

-- Function to handle firing
local function fire()
    if not canFire then return end
    canFire = false

    local shell = tankShellTemplate:Clone()
    shell.Parent = game.Workspace
    
    -- Position the shell at the tip of the barrel
    local barrelTip = barrel.CFrame * CFrame.new(0, 0, -barrel.Size.Z / 2)
    shell.CFrame = barrelTip
    
    -- Calculate launch velocity
    local launchDirection = barrelTip.LookVector
    shell.AssemblyLinearVelocity = launchDirection * firePower

    print("Fired! Power: " .. firePower)

    -- Reload timer
    task.delay(reloadTime, function()
        canFire = true
        print("Reloaded.")
    end)
end

-- Connect firing to the button click
local clickDetector = Instance.new("ClickDetector")
clickDetector.Parent = fireButton
clickDetector.MouseClick:Connect(fire)

-- Handle keyboard input
local function onInputBegan(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode == Enum.KeyCode.A then keys.turretLeft = true end
    if input.KeyCode == Enum.KeyCode.D then keys.turretRight = true end
    if input.KeyCode == Enum.KeyCode.W then keys.barrelUp = true end
    if input.KeyCode == Enum.KeyCode.S then keys.barrelDown = true end
end

local function onInputEnded(input)
    if input.KeyCode == Enum.KeyCode.A then keys.turretLeft = false end
    if input.KeyCode == Enum.KeyCode.D then keys.turretRight = false end
    if input.KeyCode == Enum.KeyCode.W then keys.barrelUp = false end
    if input.KeyCode == Enum.KeyCode.S then keys.barrelDown = false end
end

UserInputService.InputBegan:Connect(onInputBegan)
UserInputService.InputEnded:Connect(onInputEnded)

-- Game loop for continuous movement
game:GetService("RunService").Heartbeat:Connect(function(dt)
    -- Turret Rotation
    if keys.turretLeft then
        turretHinge.AngularVelocity = turnSpeed
    elseif keys.turretRight then
        turretHinge.AngularVelocity = -turnSpeed
    else
        turretHinge.AngularVelocity = 0
    end

    -- Barrel Angle
    local targetAngle = barrelHinge.TargetAngle
    if keys.barrelUp then
        targetAngle = math.min(maxAngle, targetAngle + angleSpeed)
    elseif keys.barrelDown then
        targetAngle = math.max(minAngle, targetAngle - angleSpeed)
    end
    barrelHinge.TargetAngle = targetAngle
end)

print("TankController script loaded. Use A/D to turn turret, W/S for angle, and click the button to fire.")


--- SCRIPT 2: PROJECTILE ---
-- This script goes inside the TankShell part in ReplicatedStorage.

local shell = script.Parent
local canHit = true

shell.Touched:Connect(function(hit)
    if not canHit then return end
    
    -- Check if we hit the target
    if hit.Name == "Target" then
        print("TARGET HIT!")
        -- You could add an explosion or points here
        
        -- Prevent multiple hit detections
        canHit = false
        
    elseif hit:IsDescendantOf(shell) or hit:IsDescendantOf(game.Workspace.Tank) then
        -- Ignore self-collision and hitting the tank it came from
        return
    else
        print("Hit something else: " .. hit.Name)
        canHit = false
    end
    
    -- Create a small explosion effect on impact
    local explosion = Instance.new("Explosion")
    explosion.Position = shell.Position
    explosion.BlastRadius = 5
    explosion.BlastPressure = 1000
    explosion.Parent = game.Workspace
    
    -- Destroy the shell after impact
    shell:Destroy()
end)
