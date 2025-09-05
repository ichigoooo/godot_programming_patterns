# Godot游戏开发案例和应用场景研究报告

## 概述

本报告深度分析了Godot引擎在实际游戏开发中的常见模式和最佳实践，涵盖七个核心领域：2D平台跳跃游戏、RPG数据管理、动作游戏输入处理、UI系统设计、音频管理、存档系统以及多人网络游戏。每个领域都提供了具体的使用场景、实现模式和完整的代码结构建议。

---

## 1. 2D平台跳跃游戏的常用模式

### 1.1 基础角色控制模式

#### **核心架构**
- **推荐节点类型**: `CharacterBody2D`
- **核心方法**: `_physics_process(delta)`
- **移动函数**: `move_and_slide()`
- **地面检测**: `is_on_floor()`

#### **使用场景**
- 经典马里奥式平台跳跃游戏
- 横版动作冒险游戏
- Metroidvania类型游戏

#### **基础实现模式**

```gdscript
extends CharacterBody2D

@export var speed = 1200
@export var jump_speed = -1800
@export var gravity = 4000

func _physics_process(delta):
    # 每帧添加重力
    velocity.y += gravity * delta
    
    # 水平输入控制
    velocity.x = Input.get_axis("walk_left", "walk_right") * speed
    
    # 处理移动
    move_and_slide()
    
    # 跳跃检测（仅在地面时）
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_speed
```

### 1.2 高级摩擦和加速度系统

#### **使用场景**
- 需要更真实物理感的平台游戏
- 冰面、沙地等特殊地形效果
- 精确操控要求高的游戏

#### **增强实现模式**

```gdscript
extends CharacterBody2D

@export var speed = 1200
@export var jump_speed = -1800
@export var gravity = 4000
@export_range(0.0, 1.0) var friction = 0.1
@export_range(0.0, 1.0) var acceleration = 0.25

func _physics_process(delta):
    velocity.y += gravity * delta
    
    var direction = Input.get_axis("walk_left", "walk_right")
    
    if direction != 0:
        # 有输入时加速
        velocity.x = lerp(velocity.x, direction * speed, acceleration)
    else:
        # 无输入时减速（摩擦）
        velocity.x = lerp(velocity.x, 0.0, friction)
    
    move_and_slide()
    
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_speed
```

### 1.3 组件化平台角色系统

#### **使用场景**
- 需要多种角色类型的游戏
- 角色能力可升级的RPG平台游戏
- 模块化设计需求

#### **架构建议**
```
Player (CharacterBody2D)
├── MovementComponent
├── JumpComponent  
├── HealthComponent
├── AnimationComponent
└── InputComponent
```

---

## 2. RPG游戏的数据管理模式

### 2.1 资源模式 (.tres文件)

#### **核心概念**
将游戏数据存储在独立的资源文件中，实现数据与代码分离。

#### **使用场景**
- 角色属性系统
- 装备和道具数据库
- 技能和法术系统
- 任务数据管理

#### **角色属性资源实现**

**CharacterStats.gd**
```gdscript
extends Resource
class_name CharacterStats

@export var max_health: int = 100
@export var current_health: int = 100
@export var attack_power: int = 10
@export var defense: int = 5
@export var speed: float = 200.0
@export var experience: int = 0
@export var level: int = 1

signal health_changed(new_value, max_value)
signal character_died
signal level_up(new_level)

func take_damage(amount: int):
    current_health = max(0, current_health - max(1, amount - defense))
    health_changed.emit(current_health, max_health)
    
    if current_health == 0:
        character_died.emit()

func heal(amount: int):
    current_health = min(max_health, current_health + amount)
    health_changed.emit(current_health, max_health)

func gain_experience(amount: int):
    experience += amount
    check_level_up()

func check_level_up():
    var required_exp = level * 100  # 简单的经验计算
    if experience >= required_exp:
        level += 1
        max_health += 10
        attack_power += 2
        level_up.emit(level)
```

**ItemData.gd**
```gdscript
extends Resource
class_name ItemData

@export var id: String
@export var name: String
@export var description: String
@export var icon: Texture2D
@export var item_type: ItemType
@export var rarity: Rarity
@export var value: int
@export var stackable: bool = true
@export var max_stack: int = 99

enum ItemType { WEAPON, ARMOR, CONSUMABLE, QUEST, MISC }
enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }
```

### 2.2 库存系统模式

#### **使用场景**
- RPG道具管理
- 商店系统
- 物品交易

#### **实现架构**

**Inventory.gd**
```gdscript
extends Node
class_name Inventory

@export var max_slots: int = 20
var items: Array[InventorySlot] = []

signal inventory_changed
signal item_added(item: ItemData, amount: int)
signal item_removed(item: ItemData, amount: int)

class InventorySlot:
    var item_data: ItemData
    var amount: int = 0
    
    func _init(item: ItemData = null, amt: int = 0):
        item_data = item
        amount = amt

func _ready():
    # 初始化空槽位
    items.resize(max_slots)
    for i in range(max_slots):
        items[i] = InventorySlot()

func add_item(item: ItemData, amount: int = 1) -> bool:
    # 尝试堆叠到现有物品
    if item.stackable:
        for slot in items:
            if slot.item_data == item and slot.amount < item.max_stack:
                var space_available = item.max_stack - slot.amount
                var amount_to_add = min(amount, space_available)
                slot.amount += amount_to_add
                amount -= amount_to_add
                
                if amount == 0:
                    item_added.emit(item, amount_to_add)
                    inventory_changed.emit()
                    return true
    
    # 寻找空槽位
    for slot in items:
        if slot.item_data == null:
            slot.item_data = item
            slot.amount = amount
            item_added.emit(item, amount)
            inventory_changed.emit()
            return true
    
    return false  # 库存已满

func remove_item(item: ItemData, amount: int = 1) -> bool:
    for slot in items:
        if slot.item_data == item:
            if slot.amount >= amount:
                slot.amount -= amount
                if slot.amount == 0:
                    slot.item_data = null
                
                item_removed.emit(item, amount)
                inventory_changed.emit()
                return true
    
    return false

func get_item_count(item: ItemData) -> int:
    var total = 0
    for slot in items:
        if slot.item_data == item:
            total += slot.amount
    return total
```

### 2.3 服务定位器模式

#### **使用场景**
- 全局数据访问
- 游戏系统解耦
- 测试和模拟

#### **GameManager.gd**
```gdscript
extends Node

# 服务定位器实例
var _player_data: PlayerData
var _inventory: Inventory
var _quest_manager: QuestManager
var _save_manager: SaveManager

func _ready():
    # 初始化服务
    _player_data = PlayerData.new()
    _inventory = Inventory.new()
    _quest_manager = QuestManager.new()
    _save_manager = SaveManager.new()
    
    add_child(_inventory)
    add_child(_quest_manager)
    add_child(_save_manager)

# 服务访问器
func get_player_data() -> PlayerData:
    return _player_data

func get_inventory() -> Inventory:
    return _inventory

func get_quest_manager() -> QuestManager:
    return _quest_manager

func get_save_manager() -> SaveManager:
    return _save_manager
```

---

## 3. 动作游戏的输入处理模式

### 3.1 事件驱动输入模式

#### **使用场景**
- 格斗游戏组合技
- 即时动作响应
- 精确时机控制

#### **基础事件处理**
```gdscript
extends CharacterBody2D
class_name ActionCharacter

signal action_performed(action_name: String)

func _input(event):
    # 攻击动作
    if event.is_action_pressed("attack_light"):
        perform_attack("light_attack")
    elif event.is_action_pressed("attack_heavy"):
        perform_attack("heavy_attack")
    
    # 技能释放
    if event.is_action_pressed("skill_1"):
        cast_skill(1)
    elif event.is_action_pressed("skill_2"):
        cast_skill(2)
    
    # 防御
    if event.is_action_pressed("block"):
        start_blocking()
    elif event.is_action_released("block"):
        stop_blocking()

func perform_attack(attack_type: String):
    # 检查是否可以攻击
    if can_attack():
        # 执行攻击逻辑
        action_performed.emit(attack_type)
        # 播放动画、产生伤害等
```

### 3.2 输入缓冲系统

#### **使用场景**
- 连击系统
- 容错性输入
- 流畅战斗体验

#### **InputBuffer.gd**
```gdscript
extends Node
class_name InputBuffer

@export var buffer_time: float = 0.2  # 缓冲时间（秒）

var buffered_actions: Array[BufferedAction] = []

class BufferedAction:
    var action_name: String
    var timestamp: float
    var consumed: bool = false
    
    func _init(name: String):
        action_name = name
        timestamp = Time.get_time()

func _input(event):
    # 记录所有动作输入
    for action in InputMap.get_actions():
        if event.is_action_pressed(action):
            buffer_action(action)

func buffer_action(action_name: String):
    buffered_actions.append(BufferedAction.new(action_name))

func consume_action(action_name: String) -> bool:
    var current_time = Time.get_time()
    
    for action in buffered_actions:
        if (action.action_name == action_name and 
            not action.consumed and 
            current_time - action.timestamp <= buffer_time):
            action.consumed = true
            return true
    
    return false

func _process(_delta):
    # 清理过期的缓冲动作
    var current_time = Time.get_time()
    buffered_actions = buffered_actions.filter(
        func(action): return current_time - action.timestamp <= buffer_time
    )
```

### 3.3 组合输入检测系统

#### **使用场景**
- 格斗游戏必杀技
- 复杂操作序列
- 手势识别

#### **ComboSystem.gd**
```gdscript
extends Node
class_name ComboSystem

@export var combo_window: float = 1.0  # 组合技时间窗口

var input_sequence: Array[String] = []
var last_input_time: float = 0

# 定义组合技
var combo_definitions = {
    "hadoken": ["down", "down_right", "right", "attack_light"],
    "dragon_punch": ["right", "down", "down_right", "attack_heavy"],
    "super_combo": ["down", "down_left", "left", "down", "down_left", "left", "attack_heavy"]
}

signal combo_performed(combo_name: String)

func _input(event):
    var current_time = Time.get_time()
    
    # 检查时间窗口
    if current_time - last_input_time > combo_window:
        input_sequence.clear()
    
    # 记录方向输入
    var direction = get_direction_from_event(event)
    if direction != "":
        input_sequence.append(direction)
        last_input_time = current_time
    
    # 记录按钮输入并检查组合技
    for action in ["attack_light", "attack_heavy"]:
        if event.is_action_pressed(action):
            input_sequence.append(action)
            check_combos()
            last_input_time = current_time

func get_direction_from_event(event) -> String:
    if event.is_action_pressed("move_down"): return "down"
    if event.is_action_pressed("move_up"): return "up"
    if event.is_action_pressed("move_left"): return "left"
    if event.is_action_pressed("move_right"): return "right"
    # 对角线方向检测
    if (event.is_action_pressed("move_down") and 
        event.is_action_pressed("move_right")): return "down_right"
    if (event.is_action_pressed("move_down") and 
        event.is_action_pressed("move_left")): return "down_left"
    return ""

func check_combos():
    for combo_name in combo_definitions:
        var combo_sequence = combo_definitions[combo_name]
        if sequence_matches(combo_sequence):
            combo_performed.emit(combo_name)
            input_sequence.clear()
            return

func sequence_matches(target_sequence: Array[String]) -> bool:
    if input_sequence.size() < target_sequence.size():
        return false
    
    var start_index = input_sequence.size() - target_sequence.size()
    for i in range(target_sequence.size()):
        if input_sequence[start_index + i] != target_sequence[i]:
            return false
    
    return true
```

---

## 4. UI系统的设计模式

### 4.1 MVC模式在UI中的应用

#### **使用场景**
- 复杂界面系统
- 数据驱动UI
- 多平台适配

#### **架构实现**

**UIModel.gd (数据模型)**
```gdscript
extends RefCounted
class_name UIModel

signal data_changed(property_name: String, new_value)

var _data: Dictionary = {}

func set_property(property_name: String, value):
    if _data.has(property_name) and _data[property_name] == value:
        return  # 值未改变
    
    _data[property_name] = value
    data_changed.emit(property_name, value)

func get_property(property_name: String, default_value = null):
    return _data.get(property_name, default_value)
```

**UIView.gd (视图)**
```gdscript
extends Control
class_name UIView

var model: UIModel
var controller: UIController

func initialize(ui_model: UIModel, ui_controller: UIController):
    model = ui_model
    controller = ui_controller
    
    # 连接模型信号
    model.data_changed.connect(_on_model_data_changed)
    
    # 初始化UI
    update_ui()

func _on_model_data_changed(property_name: String, new_value):
    match property_name:
        "health":
            update_health_bar(new_value)
        "inventory_items":
            update_inventory_display(new_value)
        "quest_log":
            update_quest_list(new_value)

func update_health_bar(health_value: int):
    var health_bar = $HealthBar
    health_bar.value = health_value

func update_inventory_display(items: Array):
    var inventory_grid = $InventoryGrid
    # 清空现有显示
    for child in inventory_grid.get_children():
        child.queue_free()
    
    # 添加新物品
    for item in items:
        var item_ui = preload("res://ui/ItemSlotUI.tscn").instantiate()
        item_ui.setup(item)
        inventory_grid.add_child(item_ui)

func _gui_input(event):
    # 将输入事件传递给控制器
    if controller:
        controller.handle_input(event)
```

**UIController.gd (控制器)**
```gdscript
extends RefCounted
class_name UIController

var model: UIModel
var view: UIView

func _init(ui_model: UIModel):
    model = ui_model

func handle_input(event: InputEvent):
    if event is InputEventMouseButton and event.pressed:
        handle_click(event.position)

func handle_click(position: Vector2):
    # 处理点击逻辑，更新模型
    pass

func use_item(item_id: String):
    # 业务逻辑：使用物品
    GameManager.get_inventory().use_item(item_id)
    # 更新UI模型
    model.set_property("inventory_items", GameManager.get_inventory().get_all_items())
```

### 4.2 响应式UI布局系统

#### **使用场景**
- 多分辨率适配
- 动态内容显示
- 移动端适配

#### **ResponsiveContainer.gd**
```gdscript
extends Container
class_name ResponsiveContainer

@export var breakpoints: Dictionary = {
    "mobile": 800,
    "tablet": 1200,
    "desktop": 1920
}

@export var layouts: Dictionary = {
    "mobile": preload("res://ui/layouts/MobileLayout.tscn"),
    "tablet": preload("res://ui/layouts/TabletLayout.tscn"),
    "desktop": preload("res://ui/layouts/DesktopLayout.tscn")
}

var current_layout: String = ""
var current_layout_instance: Control

func _ready():
    get_viewport().size_changed.connect(_on_viewport_size_changed)
    update_layout()

func _on_viewport_size_changed():
    update_layout()

func update_layout():
    var viewport_width = get_viewport().size.x
    var new_layout = determine_layout(viewport_width)
    
    if new_layout != current_layout:
        switch_layout(new_layout)

func determine_layout(width: int) -> String:
    if width <= breakpoints.mobile:
        return "mobile"
    elif width <= breakpoints.tablet:
        return "tablet"
    else:
        return "desktop"

func switch_layout(layout_name: String):
    # 移除当前布局
    if current_layout_instance:
        current_layout_instance.queue_free()
    
    # 加载新布局
    if layouts.has(layout_name):
        current_layout_instance = layouts[layout_name].instantiate()
        add_child(current_layout_instance)
        current_layout = layout_name
```

### 4.3 主题系统

#### **使用场景**
- 可定制化UI
- 品牌一致性
- 用户偏好设置

#### **ThemeManager.gd**
```gdscript
extends Node

var current_theme: Theme
var available_themes: Dictionary = {}

signal theme_changed(new_theme: Theme)

func _ready():
    load_available_themes()
    apply_theme("default")

func load_available_themes():
    available_themes["default"] = preload("res://themes/DefaultTheme.tres")
    available_themes["dark"] = preload("res://themes/DarkTheme.tres")
    available_themes["high_contrast"] = preload("res://themes/HighContrastTheme.tres")

func apply_theme(theme_name: String):
    if available_themes.has(theme_name):
        current_theme = available_themes[theme_name]
        update_ui_theme()
        theme_changed.emit(current_theme)

func update_ui_theme():
    # 递归应用主题到所有UI节点
    apply_theme_to_tree(get_tree().current_scene)

func apply_theme_to_tree(node: Node):
    if node is Control:
        node.theme = current_theme
    
    for child in node.get_children():
        apply_theme_to_tree(child)
```

---

## 5. 音频管理的模式

### 5.1 全局音频管理器

#### **使用场景**
- 背景音乐切换
- 音效管理
- 音量控制

#### **AudioManager.gd**
```gdscript
extends Node

@export var music_volume_db: float = 0.0
@export var sfx_volume_db: float = 0.0
@export var master_volume_db: float = 0.0
@export var fade_time: float = 2.0

var music_player_1: AudioStreamPlayer
var music_player_2: AudioStreamPlayer
var current_music_player: AudioStreamPlayer
var sfx_players: Array[AudioStreamPlayer] = []
var available_sfx_players: Array[AudioStreamPlayer] = []

const MUTE_VOLUME_DB = -80.0
const MAX_SFX_PLAYERS = 16

func _ready():
    # 创建音乐播放器
    music_player_1 = AudioStreamPlayer.new()
    music_player_2 = AudioStreamPlayer.new()
    
    add_child(music_player_1)
    add_child(music_player_2)
    
    current_music_player = music_player_1
    
    # 设置初始音量
    music_player_1.volume_db = MUTE_VOLUME_DB
    music_player_2.volume_db = MUTE_VOLUME_DB
    
    # 创建音效播放器池
    create_sfx_player_pool()

func create_sfx_player_pool():
    for i in range(MAX_SFX_PLAYERS):
        var sfx_player = AudioStreamPlayer.new()
        sfx_player.volume_db = sfx_volume_db
        add_child(sfx_player)
        sfx_players.append(sfx_player)
        available_sfx_players.append(sfx_player)
        
        # 连接播放完成信号
        sfx_player.finished.connect(_on_sfx_finished.bind(sfx_player))

func play_music(music_stream: AudioStream, fade_in: bool = true):
    if not music_stream:
        return
    
    var new_music_player = get_inactive_music_player()
    new_music_player.stream = music_stream
    new_music_player.play()
    
    if fade_in:
        # 交叉淡入淡出
        crossfade_music(new_music_player)
    else:
        # 立即切换
        current_music_player.stop()
        current_music_player = new_music_player
        new_music_player.volume_db = music_volume_db

func crossfade_music(new_player: AudioStreamPlayer):
    var old_player = current_music_player
    current_music_player = new_player
    
    # 新音乐淡入
    new_player.volume_db = MUTE_VOLUME_DB
    var fade_in_tween = create_tween()
    fade_in_tween.tween_property(
        new_player, "volume_db", 
        music_volume_db, fade_time
    ).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
    
    # 旧音乐淡出
    if old_player.playing:
        var fade_out_tween = create_tween()
        fade_out_tween.tween_property(
            old_player, "volume_db", 
            MUTE_VOLUME_DB, fade_time
        ).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
        fade_out_tween.finished.connect(old_player.stop)

func play_sfx(sfx_stream: AudioStream, volume_adjustment: float = 0.0):
    if not sfx_stream or available_sfx_players.is_empty():
        return
    
    var sfx_player = available_sfx_players.pop_back()
    sfx_player.stream = sfx_stream
    sfx_player.volume_db = sfx_volume_db + volume_adjustment
    sfx_player.play()

func _on_sfx_finished(sfx_player: AudioStreamPlayer):
    available_sfx_players.append(sfx_player)

func get_inactive_music_player() -> AudioStreamPlayer:
    return music_player_2 if current_music_player == music_player_1 else music_player_1

func set_master_volume(volume_db: float):
    master_volume_db = volume_db
    AudioServer.set_bus_volume_db(0, volume_db)

func set_music_volume(volume_db: float):
    music_volume_db = volume_db
    if current_music_player.playing:
        current_music_player.volume_db = volume_db

func set_sfx_volume(volume_db: float):
    sfx_volume_db = volume_db
    for player in sfx_players:
        if not player.playing:
            player.volume_db = volume_db
```

### 5.2 音频区域系统

#### **使用场景**
- 环境音乐切换
- 区域音效
- 3D音频定位

#### **MusicArea.gd**
```gdscript
extends Area2D
class_name MusicArea

@export var music_stream: AudioStream
@export var priority: int = 0  # 优先级，数值越高优先级越高
@export var loop: bool = true

signal area_entered(music_area: MusicArea)
signal area_exited(music_area: MusicArea)

func _ready():
    body_entered.connect(_on_body_entered)
    body_exited.connect(_on_body_exited)

func _on_body_entered(body):
    if body.has_method("get_music_areas"):
        area_entered.emit(self)

func _on_body_exited(body):
    if body.has_method("get_music_areas"):
        area_exited.emit(self)
```

**Player音乐区域追踪**
```gdscript
extends CharacterBody2D
class_name Player

var music_areas: Array[MusicArea] = []

func _ready():
    # 连接所有音乐区域的信号
    for area in get_tree().get_nodes_in_group("music_areas"):
        if area is MusicArea:
            area.area_entered.connect(_on_music_area_entered)
            area.area_exited.connect(_on_music_area_exited)

func _on_music_area_entered(music_area: MusicArea):
    music_areas.append(music_area)
    update_music()

func _on_music_area_exited(music_area: MusicArea):
    music_areas.erase(music_area)
    update_music()

func update_music():
    if music_areas.is_empty():
        # 没有音乐区域时停止音乐或播放默认音乐
        AudioManager.play_music(null)
        return
    
    # 找到最高优先级的音乐区域
    var highest_priority_area = music_areas[0]
    for area in music_areas:
        if area.priority > highest_priority_area.priority:
            highest_priority_area = area
    
    # 播放对应的音乐
    AudioManager.play_music(highest_priority_area.music_stream)

func get_music_areas() -> Array[MusicArea]:
    return music_areas
```

### 5.3 动态音频系统

#### **使用场景**
- 自适应音乐
- 战斗音乐切换
- 情绪驱动的音频

#### **DynamicAudioSystem.gd**
```gdscript
extends Node
class_name DynamicAudioSystem

enum GameState { EXPLORATION, COMBAT, CUTSCENE, MENU }

var current_state: GameState = GameState.EXPLORATION
var music_layers: Dictionary = {}
var active_layers: Array[String] = []

@export var exploration_music: AudioStream
@export var combat_music: AudioStream
@export var tension_layer: AudioStream
@export var victory_layer: AudioStream

func _ready():
    setup_music_layers()

func setup_music_layers():
    # 创建音乐层
    music_layers["base"] = create_audio_player()
    music_layers["tension"] = create_audio_player()
    music_layers["combat"] = create_audio_player()
    music_layers["victory"] = create_audio_player()

func create_audio_player() -> AudioStreamPlayer:
    var player = AudioStreamPlayer.new()
    add_child(player)
    player.volume_db = AudioManager.MUTE_VOLUME_DB
    return player

func transition_to_state(new_state: GameState):
    if new_state == current_state:
        return
    
    current_state = new_state
    
    match new_state:
        GameState.EXPLORATION:
            transition_to_exploration()
        GameState.COMBAT:
            transition_to_combat()

func transition_to_exploration():
    # 淡出战斗层
    fade_out_layer("combat")
    fade_out_layer("tension")
    
    # 淡入探索音乐
    if not music_layers["base"].playing:
        music_layers["base"].stream = exploration_music
        music_layers["base"].play()
    
    fade_in_layer("base")

func transition_to_combat():
    # 添加紧张感层
    if not music_layers["tension"].playing:
        music_layers["tension"].stream = tension_layer
        music_layers["tension"].play()
    
    fade_in_layer("tension")
    
    # 延迟后添加完整战斗音乐
    await get_tree().create_timer(2.0).timeout
    
    if not music_layers["combat"].playing:
        music_layers["combat"].stream = combat_music
        music_layers["combat"].play()
    
    fade_in_layer("combat")

func fade_in_layer(layer_name: String, duration: float = 1.0):
    if music_layers.has(layer_name):
        var tween = create_tween()
        tween.tween_property(
            music_layers[layer_name], "volume_db",
            AudioManager.music_volume_db, duration
        )

func fade_out_layer(layer_name: String, duration: float = 1.0):
    if music_layers.has(layer_name):
        var tween = create_tween()
        tween.tween_property(
            music_layers[layer_name], "volume_db",
            AudioManager.MUTE_VOLUME_DB, duration
        )
```

---

## 6. 存档系统的实现模式

### 6.1 JSON序列化存档系统

#### **使用场景**
- 可读性要求高的存档
- 调试友好的数据格式
- 简单的数据结构

#### **核心存档管理器**
```gdscript
extends Node
class_name SaveManager

const SAVE_FILE_PATH = "user://savegame.save"
const SETTINGS_FILE_PATH = "user://settings.cfg"

signal game_saved
signal game_loaded(save_data: Dictionary)
signal save_failed(error_message: String)

func save_game():
    var save_file = FileAccess.open(SAVE_FILE_PATH, FileAccess.WRITE)
    if not save_file:
        save_failed.emit("无法创建存档文件")
        return false
    
    # 获取所有需要保存的对象
    var save_nodes = get_tree().get_nodes_in_group("persist")
    
    for node in save_nodes:
        # 验证节点
        if not is_valid_save_node(node):
            continue
        
        # 获取节点数据
        var node_data = node.save()
        
        # 添加基础信息
        node_data["filename"] = node.scene_file_path
        node_data["parent"] = node.get_parent().get_path()
        
        # 转换为JSON并保存
        var json_string = JSON.stringify(node_data)
        save_file.store_line(json_string)
    
    save_file.close()
    game_saved.emit()
    return true

func load_game() -> bool:
    if not FileAccess.file_exists(SAVE_FILE_PATH):
        save_failed.emit("存档文件不存在")
        return false
    
    # 清理现有的可保存对象
    var save_nodes = get_tree().get_nodes_in_group("persist")
    for node in save_nodes:
        node.queue_free()
    
    # 等待一帧确保节点被清理
    await get_tree().process_frame
    
    var save_file = FileAccess.open(SAVE_FILE_PATH, FileAccess.READ)
    if not save_file:
        save_failed.emit("无法打开存档文件")
        return false
    
    # 逐行读取并重建对象
    while save_file.get_position() < save_file.get_length():
        var json_string = save_file.get_line()
        
        if json_string.is_empty():
            continue
        
        var json = JSON.new()
        var parse_result = json.parse(json_string)
        
        if parse_result != OK:
            print("存档数据解析错误: ", json_string)
            continue
        
        var node_data = json.data
        restore_node(node_data)
    
    save_file.close()
    game_loaded.emit({})
    return true

func is_valid_save_node(node: Node) -> bool:
    # 检查是否有save方法
    if not node.has_method("save"):
        print("节点 ", node.name, " 没有save方法")
        return false
    
    # 检查是否是实例化的场景
    if node.scene_file_path.is_empty():
        print("节点 ", node.name, " 不是场景文件实例")
        return false
    
    return true

func restore_node(node_data: Dictionary):
    # 加载场景并实例化
    var scene = load(node_data["filename"])
    if not scene:
        print("无法加载场景: ", node_data["filename"])
        return
    
    var new_object = scene.instantiate()
    
    # 添加到父节点
    var parent_path = node_data["parent"]
    var parent_node = get_tree().current_scene.get_node(parent_path)
    if not parent_node:
        print("找不到父节点: ", parent_path)
        new_object.queue_free()
        return
    
    parent_node.add_child(new_object)
    
    # 设置位置（如果有的话）
    if "pos_x" in node_data and "pos_y" in node_data:
        new_object.position = Vector2(node_data["pos_x"], node_data["pos_y"])
    
    # 恢复其他属性
    for key in node_data:
        if key in ["filename", "parent", "pos_x", "pos_y"]:
            continue
        
        if new_object.has_method("set_" + key):
            new_object.call("set_" + key, node_data[key])
        else:
            new_object.set(key, node_data[key])
```

### 6.2 可保存对象基类

#### **使用场景**
- 统一的保存接口
- 自动化数据管理
- 类型安全的序列化

#### **Saveable.gd**
```gdscript
extends Node
class_name Saveable

# 需要保存的属性列表
@export var save_properties: Array[String] = []

# 自动添加到persist组
func _ready():
    add_to_group("persist")

# 基础保存方法，子类可以重写
func save() -> Dictionary:
    var save_data = {}
    
    # 自动保存导出的属性
    for property in save_properties:
        if property in self:
            var value = get(property)
            
            # 处理特殊类型的序列化
            if value is Vector2:
                save_data[property + "_x"] = value.x
                save_data[property + "_y"] = value.y
            elif value is Vector3:
                save_data[property + "_x"] = value.x
                save_data[property + "_y"] = value.y
                save_data[property + "_z"] = value.z
            elif value is Color:
                save_data[property + "_r"] = value.r
                save_data[property + "_g"] = value.g
                save_data[property + "_b"] = value.b
                save_data[property + "_a"] = value.a
            else:
                save_data[property] = value
    
    # 调用子类的自定义保存逻辑
    add_custom_save_data(save_data)
    
    return save_data

# 基础加载方法，子类可以重写
func load_data(data: Dictionary):
    for key in data:
        # 处理特殊类型的反序列化
        if key.ends_with("_x") and (key.replace("_x", "_y") in data):
            var base_name = key.replace("_x", "")
            if key.replace("_x", "_z") in data:  # Vector3
                set(base_name, Vector3(
                    data[key], 
                    data[base_name + "_y"], 
                    data[base_name + "_z"]
                ))
            else:  # Vector2
                set(base_name, Vector2(data[key], data[base_name + "_y"]))
        elif key.ends_with("_r") and (key.replace("_r", "_g") in data):
            # Color
            var base_name = key.replace("_r", "")
            set(base_name, Color(
                data[key], 
                data[base_name + "_g"], 
                data[base_name + "_b"], 
                data[base_name + "_a"]
            ))
        elif not key.contains("_x") and not key.contains("_y") and not key.contains("_z") and not key.contains("_r") and not key.contains("_g") and not key.contains("_b") and not key.contains("_a"):
            # 普通属性
            if key in self:
                set(key, data[key])
    
    # 调用子类的自定义加载逻辑
    apply_custom_load_data(data)

# 供子类重写的自定义保存数据方法
func add_custom_save_data(save_data: Dictionary):
    pass

# 供子类重写的自定义加载数据方法
func apply_custom_load_data(data: Dictionary):
    pass
```

### 6.3 高级存档系统特性

#### **使用场景**
- 多存档管理
- 自动保存
- 存档完整性检查

#### **AdvancedSaveManager.gd**
```gdscript
extends SaveManager
class_name AdvancedSaveManager

const MAX_SAVE_SLOTS = 10
const AUTO_SAVE_INTERVAL = 300.0  # 5分钟自动保存
const SAVE_VERSION = "1.0"

var auto_save_timer: Timer
var current_save_slot: int = 0

func _ready():
    setup_auto_save()

func setup_auto_save():
    auto_save_timer = Timer.new()
    auto_save_timer.wait_time = AUTO_SAVE_INTERVAL
    auto_save_timer.timeout.connect(auto_save)
    auto_save_timer.autostart = true
    add_child(auto_save_timer)

func save_to_slot(slot: int) -> bool:
    if slot < 0 or slot >= MAX_SAVE_SLOTS:
        save_failed.emit("无效的存档槽位: " + str(slot))
        return false
    
    var slot_path = get_save_slot_path(slot)
    current_save_slot = slot
    
    return save_game_to_path(slot_path)

func load_from_slot(slot: int) -> bool:
    if slot < 0 or slot >= MAX_SAVE_SLOTS:
        save_failed.emit("无效的存档槽位: " + str(slot))
        return false
    
    var slot_path = get_save_slot_path(slot)
    if not FileAccess.file_exists(slot_path):
        save_failed.emit("存档槽位 " + str(slot) + " 不存在")
        return false
    
    current_save_slot = slot
    return load_game_from_path(slot_path)

func get_save_slot_path(slot: int) -> String:
    return "user://save_slot_" + str(slot) + ".save"

func get_save_slot_info(slot: int) -> Dictionary:
    var slot_path = get_save_slot_path(slot)
    if not FileAccess.file_exists(slot_path):
        return {}
    
    var file = FileAccess.open(slot_path, FileAccess.READ)
    if not file:
        return {}
    
    # 读取第一行作为元数据
    var first_line = file.get_line()
    file.close()
    
    var json = JSON.new()
    if json.parse(first_line) == OK:
        return json.data.get("metadata", {})
    
    return {}

func save_game_to_path(file_path: String) -> bool:
    var save_file = FileAccess.open(file_path, FileAccess.WRITE)
    if not save_file:
        save_failed.emit("无法创建存档文件: " + file_path)
        return false
    
    # 创建元数据
    var metadata = create_save_metadata()
    var metadata_line = JSON.stringify({"metadata": metadata})
    save_file.store_line(metadata_line)
    
    # 保存游戏数据
    var save_nodes = get_tree().get_nodes_in_group("persist")
    for node in save_nodes:
        if not is_valid_save_node(node):
            continue
        
        var node_data = node.save()
        node_data["filename"] = node.scene_file_path
        node_data["parent"] = node.get_parent().get_path()
        
        var json_string = JSON.stringify(node_data)
        save_file.store_line(json_string)
    
    save_file.close()
    game_saved.emit()
    return true

func create_save_metadata() -> Dictionary:
    return {
        "version": SAVE_VERSION,
        "timestamp": Time.get_unix_time_from_system(),
        "playtime": get_playtime(),
        "level": get_current_level(),
        "player_name": get_player_name()
    }

func load_game_from_path(file_path: String) -> bool:
    var save_file = FileAccess.open(file_path, FileAccess.READ)
    if not save_file:
        save_failed.emit("无法打开存档文件: " + file_path)
        return false
    
    # 读取并验证元数据
    var metadata_line = save_file.get_line()
    var json = JSON.new()
    if json.parse(metadata_line) != OK:
        save_failed.emit("存档元数据损坏")
        save_file.close()
        return false
    
    var metadata = json.data.get("metadata", {})
    if not validate_save_version(metadata.get("version", "")):
        save_failed.emit("存档版本不兼容")
        save_file.close()
        return false
    
    # 清理现有数据
    var save_nodes = get_tree().get_nodes_in_group("persist")
    for node in save_nodes:
        node.queue_free()
    
    await get_tree().process_frame
    
    # 加载游戏数据
    while save_file.get_position() < save_file.get_length():
        var json_string = save_file.get_line()
        if json_string.is_empty():
            continue
        
        json = JSON.new()
        if json.parse(json_string) == OK:
            restore_node(json.data)
    
    save_file.close()
    game_loaded.emit(metadata)
    return true

func validate_save_version(version: String) -> bool:
    # 简单的版本检查逻辑
    return version == SAVE_VERSION

func auto_save():
    if current_save_slot >= 0:
        save_to_slot(current_save_slot)

func get_playtime() -> float:
    # 获取游戏时长的实现
    return 0.0

func get_current_level() -> String:
    # 获取当前关卡的实现
    return ""

func get_player_name() -> String:
    # 获取玩家名称的实现
    return ""
```

---

## 7. 多人游戏的网络模式

### 7.1 客户端-服务器架构

#### **使用场景**
- 权威服务器游戏
- 反作弊需求
- 大型多人在线游戏

#### **基础网络管理器**
```gdscript
extends Node
class_name NetworkManager

const DEFAULT_PORT = 7000
const MAX_CLIENTS = 4

var is_server: bool = false
var players: Dictionary = {}

signal player_connected(id: int)
signal player_disconnected(id: int)
signal connection_failed
signal connected_to_server
signal server_disconnected

func _ready():
    # 连接多人游戏信号
    multiplayer.peer_connected.connect(_on_player_connected)
    multiplayer.peer_disconnected.connect(_on_player_disconnected)
    multiplayer.connected_to_server.connect(_on_connected_to_server)
    multiplayer.connection_failed.connect(_on_connection_failed)
    multiplayer.server_disconnected.connect(_on_server_disconnected)

func create_server(port: int = DEFAULT_PORT) -> bool:
    var peer = ENetMultiplayerPeer.new()
    var error = peer.create_server(port, MAX_CLIENTS)
    
    if error != OK:
        print("服务器创建失败: ", error)
        return false
    
    multiplayer.multiplayer_peer = peer
    is_server = true
    
    print("服务器已创建，端口: ", port)
    return true

func join_server(ip: String, port: int = DEFAULT_PORT) -> bool:
    var peer = ENetMultiplayerPeer.new()
    var error = peer.create_client(ip, port)
    
    if error != OK:
        print("连接服务器失败: ", error)
        return false
    
    multiplayer.multiplayer_peer = peer
    is_server = false
    
    print("正在连接服务器: ", ip, ":", port)
    return true

func disconnect_from_game():
    if multiplayer.multiplayer_peer:
        multiplayer.multiplayer_peer.close()
        multiplayer.multiplayer_peer = null
    
    players.clear()
    is_server = false

# 信号处理
func _on_player_connected(id: int):
    print("玩家连接: ", id)
    players[id] = create_player_data(id)
    player_connected.emit(id)

func _on_player_disconnected(id: int):
    print("玩家断开: ", id)
    if id in players:
        players.erase(id)
    player_disconnected.emit(id)

func _on_connected_to_server():
    print("已连接到服务器")
    connected_to_server.emit()

func _on_connection_failed():
    print("连接服务器失败")
    connection_failed.emit()

func _on_server_disconnected():
    print("与服务器断开连接")
    server_disconnected.emit()

func create_player_data(id: int) -> Dictionary:
    return {
        "id": id,
        "name": "Player" + str(id),
        "position": Vector2.ZERO,
        "health": 100
    }

# RPC方法示例
@rpc("any_peer", "call_local")
func update_player_position(player_id: int, position: Vector2):
    if is_server:
        # 服务器验证并广播
        if player_id in players:
            players[player_id]["position"] = position
            # 向所有其他客户端广播
            rpc("receive_player_position", player_id, position)

@rpc("authority", "call_local")
func receive_player_position(player_id: int, position: Vector2):
    # 更新本地玩家位置显示
    if player_id in players:
        players[player_id]["position"] = position
        update_player_visual(player_id, position)

func update_player_visual(player_id: int, position: Vector2):
    # 更新玩家角色的可视位置
    var player_node = get_tree().get_first_node_in_group("player_" + str(player_id))
    if player_node:
        player_node.position = position
```

### 7.2 状态同步系统

#### **使用场景**
- 实时多人游戏
- 移动和位置同步
- 游戏状态一致性

#### **NetworkedPlayer.gd**
```gdscript
extends CharacterBody2D
class_name NetworkedPlayer

@export var player_id: int = 0
@export var sync_rate: float = 20.0  # 每秒同步次数

var network_position: Vector2
var network_velocity: Vector2
var network_rotation: float

var sync_timer: Timer
var is_local_player: bool = false

func _ready():
    # 检查是否是本地玩家
    is_local_player = (multiplayer.get_unique_id() == player_id)
    
    # 设置同步定时器
    sync_timer = Timer.new()
    sync_timer.wait_time = 1.0 / sync_rate
    sync_timer.timeout.connect(sync_to_network)
    sync_timer.autostart = true
    add_child(sync_timer)
    
    # 初始化网络状态
    network_position = position
    network_velocity = velocity

func _physics_process(delta):
    if is_local_player:
        # 本地玩家处理输入
        handle_input()
        move_and_slide()
    else:
        # 远程玩家插值到网络位置
        interpolate_to_network_state(delta)

func handle_input():
    var input_vector = Vector2.ZERO
    
    if Input.is_action_pressed("move_left"):
        input_vector.x -= 1
    if Input.is_action_pressed("move_right"):
        input_vector.x += 1
    if Input.is_action_pressed("move_up"):
        input_vector.y -= 1
    if Input.is_action_pressed("move_down"):
        input_vector.y += 1
    
    velocity = input_vector.normalized() * 300

func interpolate_to_network_state(delta):
    # 平滑插值到网络位置
    var interpolation_rate = 10.0
    
    position = position.lerp(network_position, interpolation_rate * delta)
    velocity = velocity.lerp(network_velocity, interpolation_rate * delta)
    rotation = lerp_angle(rotation, network_rotation, interpolation_rate * delta)

func sync_to_network():
    if is_local_player and multiplayer.has_multiplayer_peer():
        # 发送当前状态到服务器
        rpc_unreliable("receive_player_state", position, velocity, rotation)

@rpc("any_peer", "unreliable")
func receive_player_state(pos: Vector2, vel: Vector2, rot: float):
    # 仅服务器处理状态更新
    if multiplayer.is_server():
        # 简单的反作弊检查
        var distance = pos.distance_to(network_position)
        var max_distance = 500.0 * (1.0 / sync_rate)  # 基于同步率的最大移动距离
        
        if distance <= max_distance:
            network_position = pos
            network_velocity = vel
            network_rotation = rot
            
            # 广播给所有其他客户端
            rpc_unreliable("update_remote_player_state", player_id, pos, vel, rot)

@rpc("authority", "unreliable")
func update_remote_player_state(id: int, pos: Vector2, vel: Vector2, rot: float):
    if id == player_id and not is_local_player:
        network_position = pos
        network_velocity = vel
        network_rotation = rot
```

### 7.3 房间和匹配系统

#### **使用场景**
- 多房间游戏
- 玩家匹配
- 游戏会话管理

#### **RoomManager.gd**
```gdscript
extends Node
class_name RoomManager

signal room_created(room_id: String)
signal room_joined(room_id: String)
signal room_left(room_id: String)
signal player_joined_room(player_id: int, room_id: String)
signal player_left_room(player_id: int, room_id: String)

var rooms: Dictionary = {}
var current_room_id: String = ""
var max_players_per_room: int = 4

class GameRoom:
    var room_id: String
    var host_id: int
    var players: Dictionary = {}
    var max_players: int
    var is_game_started: bool = false
    var room_settings: Dictionary = {}
    
    func _init(id: String, host: int, max_p: int = 4):
        room_id = id
        host_id = host
        max_players = max_p
        players[host] = create_player_info(host)
    
    func create_player_info(player_id: int) -> Dictionary:
        return {
            "id": player_id,
            "name": "Player" + str(player_id),
            "ready": false,
            "team": 0
        }
    
    func add_player(player_id: int) -> bool:
        if players.size() >= max_players:
            return false
        
        players[player_id] = create_player_info(player_id)
        return true
    
    func remove_player(player_id: int):
        if player_id in players:
            players.erase(player_id)
        
        # 如果房主离开，选择新房主
        if player_id == host_id and players.size() > 0:
            host_id = players.keys()[0]
    
    func is_full() -> bool:
        return players.size() >= max_players
    
    func are_all_players_ready() -> bool:
        for player_data in players.values():
            if not player_data["ready"]:
                return false
        return true

func create_room(room_id: String = "") -> String:
    if room_id.is_empty():
        room_id = generate_room_id()
    
    if room_id in rooms:
        print("房间已存在: ", room_id)
        return ""
    
    var new_room = GameRoom.new(room_id, multiplayer.get_unique_id(), max_players_per_room)
    rooms[room_id] = new_room
    current_room_id = room_id
    
    room_created.emit(room_id)
    print("房间已创建: ", room_id)
    return room_id

func join_room(room_id: String) -> bool:
    if not room_id in rooms:
        print("房间不存在: ", room_id)
        return false
    
    var room = rooms[room_id] as GameRoom
    if room.is_full():
        print("房间已满: ", room_id)
        return false
    
    var player_id = multiplayer.get_unique_id()
    if room.add_player(player_id):
        current_room_id = room_id
        room_joined.emit(room_id)
        
        # 通知房间内所有玩家
        rpc("on_player_joined_room", player_id, room_id)
        player_joined_room.emit(player_id, room_id)
        
        print("加入房间成功: ", room_id)
        return true
    
    return false

func leave_room():
    if current_room_id.is_empty():
        return
    
    var player_id = multiplayer.get_unique_id()
    var room = rooms.get(current_room_id) as GameRoom
    
    if room:
        room.remove_player(player_id)
        
        # 通知其他玩家
        rpc("on_player_left_room", player_id, current_room_id)
        player_left_room.emit(player_id, current_room_id)
        
        # 如果房间为空，删除房间
        if room.players.is_empty():
            rooms.erase(current_room_id)
    
    room_left.emit(current_room_id)
    current_room_id = ""

func get_available_rooms() -> Array[Dictionary]:
    var available_rooms: Array[Dictionary] = []
    
    for room_id in rooms:
        var room = rooms[room_id] as GameRoom
        if not room.is_full() and not room.is_game_started:
            available_rooms.append({
                "id": room_id,
                "host": room.host_id,
                "players": room.players.size(),
                "max_players": room.max_players,
                "settings": room.room_settings
            })
    
    return available_rooms

func set_player_ready(ready: bool):
    if current_room_id.is_empty():
        return
    
    var room = rooms.get(current_room_id) as GameRoom
    var player_id = multiplayer.get_unique_id()
    
    if room and player_id in room.players:
        room.players[player_id]["ready"] = ready
        rpc("on_player_ready_changed", player_id, ready)
        
        # 检查是否所有玩家都准备好了
        if room.are_all_players_ready() and room.players.size() > 1:
            start_game()

func start_game():
    if current_room_id.is_empty():
        return
    
    var room = rooms.get(current_room_id) as GameRoom
    if not room or room.host_id != multiplayer.get_unique_id():
        return  # 只有房主可以开始游戏
    
    room.is_game_started = true
    rpc("on_game_started", current_room_id)

func generate_room_id() -> String:
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    var room_id = ""
    
    for i in range(6):
        room_id += characters[randi() % characters.length()]
    
    return room_id

# RPC方法
@rpc("any_peer", "call_local")
func on_player_joined_room(player_id: int, room_id: String):
    player_joined_room.emit(player_id, room_id)

@rpc("any_peer", "call_local")
func on_player_left_room(player_id: int, room_id: String):
    player_left_room.emit(player_id, room_id)

@rpc("any_peer", "call_local")
func on_player_ready_changed(player_id: int, ready: bool):
    if current_room_id in rooms:
        var room = rooms[current_room_id] as GameRoom
        if player_id in room.players:
            room.players[player_id]["ready"] = ready

@rpc("authority", "call_local")
func on_game_started(room_id: String):
    print("游戏开始: ", room_id)
    # 切换到游戏场景
    get_tree().change_scene_to_file("res://scenes/GameScene.tscn")
```

### 7.4 网络优化和错误处理

#### **使用场景**
- 网络延迟处理
- 连接丢失恢复
- 性能优化

#### **NetworkOptimizer.gd**
```gdscript
extends Node
class_name NetworkOptimizer

@export var ping_interval: float = 1.0
@export var timeout_duration: float = 10.0
@export var max_retries: int = 3

var ping_timer: Timer
var timeout_timer: Timer
var ping_times: Dictionary = {}
var retry_counts: Dictionary = {}

signal connection_quality_changed(quality: ConnectionQuality)
signal player_timeout(player_id: int)

enum ConnectionQuality { EXCELLENT, GOOD, POOR, TERRIBLE }

func _ready():
    setup_ping_system()
    setup_timeout_system()

func setup_ping_system():
    ping_timer = Timer.new()
    ping_timer.wait_time = ping_interval
    ping_timer.timeout.connect(send_ping)
    ping_timer.autostart = true
    add_child(ping_timer)

func setup_timeout_system():
    timeout_timer = Timer.new()
    timeout_timer.wait_time = timeout_duration
    timeout_timer.timeout.connect(check_timeouts)
    timeout_timer.autostart = true
    add_child(timeout_timer)

func send_ping():
    if multiplayer.has_multiplayer_peer() and multiplayer.is_server():
        for peer_id in multiplayer.get_peers():
            var timestamp = Time.get_ticks_msec()
            rpc_id(peer_id, "receive_ping", timestamp)

@rpc("any_peer")
func receive_ping(timestamp: int):
    # 立即回应ping
    var sender_id = multiplayer.get_remote_sender_id()
    rpc_id(sender_id, "receive_pong", timestamp, Time.get_ticks_msec())

@rpc("any_peer")
func receive_pong(original_timestamp: int, remote_timestamp: int):
    var current_time = Time.get_ticks_msec()
    var sender_id = multiplayer.get_remote_sender_id()
    
    # 计算往返时间和单程延迟
    var rtt = current_time - original_timestamp
    var ping = rtt / 2
    
    ping_times[sender_id] = ping
    update_connection_quality(sender_id, ping)

func update_connection_quality(player_id: int, ping: int):
    var quality: ConnectionQuality
    
    if ping < 50:
        quality = ConnectionQuality.EXCELLENT
    elif ping < 100:
        quality = ConnectionQuality.GOOD
    elif ping < 200:
        quality = ConnectionQuality.POOR
    else:
        quality = ConnectionQuality.TERRIBLE
    
    connection_quality_changed.emit(quality)

func check_timeouts():
    var current_time = Time.get_ticks_msec()
    
    for peer_id in ping_times:
        var last_ping = ping_times.get(peer_id, 0)
        if current_time - last_ping > timeout_duration * 1000:
            handle_player_timeout(peer_id)

func handle_player_timeout(player_id: int):
    retry_counts[player_id] = retry_counts.get(player_id, 0) + 1
    
    if retry_counts[player_id] >= max_retries:
        player_timeout.emit(player_id)
        retry_counts.erase(player_id)
        ping_times.erase(player_id)
    else:
        # 尝试重新连接
        attempt_reconnect(player_id)

func attempt_reconnect(player_id: int):
    print("尝试重新连接玩家: ", player_id)
    # 实现重连逻辑

# 网络性能统计
func get_network_stats() -> Dictionary:
    var stats = {
        "average_ping": 0,
        "packet_loss": 0.0,
        "bandwidth_usage": 0
    }
    
    if ping_times.size() > 0:
        var total_ping = 0
        for ping in ping_times.values():
            total_ping += ping
        stats["average_ping"] = total_ping / ping_times.size()
    
    return stats

# 动态调整网络设置
func adjust_network_settings(quality: ConnectionQuality):
    match quality:
        ConnectionQuality.EXCELLENT:
            # 高质量连接：增加同步频率
            set_sync_rate(30.0)
        ConnectionQuality.GOOD:
            # 良好连接：正常同步频率
            set_sync_rate(20.0)
        ConnectionQuality.POOR:
            # 较差连接：降低同步频率
            set_sync_rate(10.0)
        ConnectionQuality.TERRIBLE:
            # 糟糕连接：最低同步频率
            set_sync_rate(5.0)

func set_sync_rate(rate: float):
    # 通知所有网络对象调整同步频率
    get_tree().call_group("networked_objects", "set_sync_rate", rate)
```

---

## 总结与建议

### 核心设计原则

1. **模块化设计**: 使用组件化架构，提高代码复用性和维护性
2. **数据驱动**: 将游戏数据与逻辑分离，使用资源文件管理配置
3. **信号机制**: 充分利用Godot的信号系统实现松耦合通信
4. **性能优化**: 在必要时使用对象池、状态缓存等优化技术
5. **用户体验**: 提供响应式界面、流畅的输入处理和稳定的网络体验

### 最佳实践建议

1. **优先使用Godot内置功能**: 如信号系统、场景系统、节点组等
2. **合理选择设计模式**: 避免过度设计，优先考虑简单明了的解决方案
3. **重视测试和调试**: 建立完善的错误处理和日志系统
4. **考虑扩展性**: 为未来功能扩展预留接口和架构空间
5. **文档和注释**: 保持良好的代码文档习惯，便于团队协作

这些模式和实践已被广泛验证，可以为Godot游戏开发提供坚实的技术基础。根据具体项目需求，可以选择性地应用和调整这些模式。
