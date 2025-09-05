# Godot游戏编程模式（C#版）

## 引言

本书旨在为使用C#的Godot开发者提供一套实用的游戏编程模式。它并非对经典设计模式的简单重复，而是将这些经过时间考验的解决方案与Godot引擎的独特架构（如节点、信号和资源）相结合，提供专门针对Godot C#开发者的具体实现和最佳实践。

无论您是在构建一个复杂的RPG系统、一个快节奏的动作游戏，还是一个数据驱动的UI界面，本书中的模式都将帮助您编写出更清晰、更可维护、更高效和更具扩展性的代码。我们将深入探讨每种模式的动机，展示其在Godot C#中的完整实现，并提供来自真实游戏场景的案例。

本书的结构遵循了Robert Nystrom的经典著作《Game Programming Patterns》，但所有示例和讨论都已完全适配Godot 4.x和C#/.NET 8。

---

## 第一部分：经典设计模式回顾 (Design Patterns Revisited)

本部分我们将重新审视一些来自原“四人帮”（GoF）《设计模式：可复用面向对象软件的基础》一书中的经典模式。这些模式是软件工程的基石，但我们将从现代游戏开发，特别是Godot C#开发者的视角来解读它们。我们将探讨如何利用Godot的原生特性来实现这些模式，使它们在游戏项目中发挥最大效力。

### 第1章 - 命令模式 (Command)

#### **1.1 动机**

在游戏中，我们经常需要处理来自玩家的操作，如“开火”、“跳跃”、“使用道具”，或者更复杂的操作，如在策略游戏中“训练一个单位”。命令模式的核心思想是将一个请求或操作封装成一个独立的对象。

这样做带来了几个巨大的好处：
- **解耦**: 发出请求的对象（例如，一个按钮或输入处理器）不需要知道接收请求的对象（例如，一个玩家角色或一个单位）的任何信息，也不需要知道操作是如何执行的。它只需要知道如何发出一个“命令”。
- **可存储和可传递**: 因为命令是对象，所以它们可以被存储在变量中，放入队列，通过网络发送，或者序列化到文件中。
- **支持撤销/重做**: 这是命令模式最强大的应用之一。由于每个命令对象都可以知道如何执行操作，我们也可以教会它如何“撤销”该操作。通过维护一个命令历史列表，实现复杂的撤销和重做功能变得轻而易举，这在关卡编辑器或策略游戏中至关重要。
- **可配置性**: 我们可以动态地改变一个对象在响应某个输入时执行的命令。例如，玩家拾取了新的武器后，我们可以将“开火”按钮关联的命令对象从“发射手枪命令”替换为“发射火箭筒命令”。

在Godot中，一个典型的场景是构建一个RTS（即时战略游戏）的单位控制系统。当玩家选中一个单位并点击地图上的一个点时，我们不想让UI代码直接调用`unit.MoveTo(position)`。这会产生紧密的耦合。相反，UI代码可以创建一个`MoveCommand`对象，并将其分派给相应的单位。

#### **1.2 Godot中的实现方式**

Godot为命令模式提供了一个非常强大的内置类：`UndoRedo`。它主要用于编辑器工具的开发，但同样可以用于游戏中的撤销/重做系统。然而，为了更好地理解命令模式的本质并处理更广泛的游戏逻辑（如AI行为队列），我们将首先实现一个自定义的命令模式结构，然后再介绍如何使用`UndoRedo`。

#### **1.3 C# 实现：自定义命令系统**

我们将构建一个简单的输入处理系统，玩家可以控制一个角色移动，并且可以随时撤销和重做移动操作。

**1. 定义命令接口**

首先，我们定义一个所有命令都必须实现的接口。

```csharp
// ICommand.cs
public interface ICommand
{
    void Execute();
    void Undo();
}
```

**2. 创建具体命令**

接下来，我们创建一个具体的移动命令。这个命令需要知道它要移动哪个角色以及移动到哪里。

```csharp
// MoveCommand.cs
using Godot;

public class MoveCommand : ICommand
{
    private CharacterBody2D _character;
    private Vector2 _oldPosition;
    private Vector2 _newPosition;

    public MoveCommand(CharacterBody2D character, Vector2 newPosition)
    {
        _character = character;
        _newPosition = newPosition;
        // 在执行前记录旧位置，以便撤销
        _oldPosition = _character.Position;
    }

    public void Execute()
    {
        // 执行移动
        _character.Position = _newPosition;
        GD.Print($"Character moved to {_newPosition}");
    }

    public void Undo()
    {
        // 撤销移动
        _character.Position = _oldPosition;
        GD.Print($"Character moved back to {_oldPosition}");
    }
}
```

**3. 创建命令调用者（历史记录管理者）**

我们需要一个类来执行命令并管理历史记录，以便实现撤销和重做。

```csharp
// CommandManager.cs
using System.Collections.Generic;
using Godot;

public partial class CommandManager : Node
{
    private List<ICommand> _commandHistory = new List<ICommand>();
    private int _currentCommandIndex = -1;

    public void ExecuteCommand(ICommand command)
    {
        // 如果我们在历史记录中间执行了新命令，
        // 那么丢弃所有“未来”的重做步骤
        if (_currentCommandIndex < _commandHistory.Count - 1)
        {
            _commandHistory.RemoveRange(_currentCommandIndex + 1, _commandHistory.Count - (_currentCommandIndex + 1));
        }

        command.Execute();
        _commandHistory.Add(command);
        _currentCommandIndex++;
    }

    public void Undo()
    {
        if (_currentCommandIndex >= 0)
        {
            _commandHistory[_currentCommandIndex].Undo();
            _currentCommandIndex--;
            GD.Print("Undo successful.");
        }
        else
        {
            GD.Print("No more actions to undo.");
        }
    }

    public void Redo()
    {
        if (_currentCommandIndex < _commandHistory.Count - 1)
        {
            _currentCommandIndex++;
            _commandHistory[_currentCommandIndex].Execute();
            GD.Print("Redo successful.");
        }
        else
        {
            GD.Print("No more actions to redo.");
        }
    }
}
```

**4. 组装场景**

现在，我们把所有东西放在Godot场景中。
- 创建一个 `Player` 场景 (CharacterBody2D)。
- 创建一个 `Main` 场景，包含 `Player` 和一个 `CommandManager` 节点。
- 在 `Main` 场景中添加一个脚本来处理输入。

```csharp
// Main.cs
using Godot;

public partial class Main : Node
{
    private Player _player;
    private CommandManager _commandManager;

    public override void _Ready()
    {
        _player = GetNode<Player>("Player");
        _commandManager = GetNode<CommandManager>("CommandManager");
    }

    public override void _Input(InputEvent @event)
    {
        // 按下鼠标左键，移动玩家
        if (@event is InputEventMouseButton mouseEvent && mouseEvent.Pressed && mouseEvent.ButtonIndex == MouseButton.Left)
        {
            ICommand moveCommand = new MoveCommand(_player, GetGlobalMousePosition());
            _commandManager.ExecuteCommand(moveCommand);
        }

        // 按下 'Z' 键撤销
        if (@event.IsActionPressed("ui_undo"))
        {
            _commandManager.Undo();
        }

        // 按下 'Y' 键重做
        if (@event.IsActionPressed("ui_redo"))
        {
            _commandManager.Redo();
        }
    }
}

// 在Godot的 项目->项目设置->输入映射 中添加 "ui_undo" (Z键) 和 "ui_redo" (Y键)
```

#### **1.4 Godot C# 实现：使用内置 `UndoRedo` 类**

对于关卡编辑器等工具类场景，Godot的 `UndoRedo` 类是更简单直接的选择。它内部已经实现了命令历史和管理逻辑。

```csharp
// LevelEditor.cs
using Godot;

public partial class LevelEditor : Node
{
    private UndoRedo _undoRedo = new UndoRedo();
    private Node2D _selectedObject; // 假设这是当前选中的对象

    public override void _Input(InputEvent @event)
    {
        // 移动对象
        if (@event is InputEventMouseButton mouseEvent && mouseEvent.Pressed && _selectedObject != null)
        {
            Vector2 newPosition = GetGlobalMousePosition();
            MoveObjectWithUndo(_selectedObject, newPosition);
        }

        // 撤销
        if (@event.IsActionPressed("ui_undo"))
        {
            _undoRedo.Undo();
        }

        // 重做
        if (@event.IsActionPressed("ui_redo"))
        {
            _undoRedo.Redo();
        }
    }

    private void MoveObjectWithUndo(Node2D obj, Vector2 newPosition)
    {
        Vector2 oldPosition = obj.Position;

        // 创建一个操作记录
        _undoRedo.CreateAction("Move Object");

        // 定义“执行”操作：设置新位置
        _undoRedo.AddDoProperty(obj, "position", newPosition);
        // 定义“撤销”操作：恢复旧位置
        _undoRedo.AddUndoProperty(obj, "position", oldPosition);

        // 提交操作到历史记录
        _undoRedo.CommitAction();

        GD.Print($"Object moved to {newPosition}");
    }
    
    // 还可以用方法调用来记录
    private void PlaceObjectWithUndo(Node newObject, Node parent)
    {
        _undoRedo.CreateAction("Place Object");
        
        // 执行：添加子节点
        _undoRedo.AddDoMethod(parent, "add_child", newObject);
        // 撤销：移除子节点
        _undoRedo.AddUndoMethod(parent, "remove_child", newObject);
        
        _undoRedo.CommitAction();
    }
}
```

#### **1.5 游戏案例**

- **《星际争霸》等RTS游戏**: 玩家对单位下达的移动、攻击、建造等指令都可以被封装成命令对象，放入单位的命令队列中依次执行。
- **《陷阵之志》(Into the Breach)**: 这是一个回合制策略游戏，玩家每一步操作后都可以“重置回合”。这本质上就是一个大规模的撤销操作，通过命令模式可以完美实现。
- **关卡编辑器**: 几乎所有带有关卡编辑器的游戏（如《马力欧创作家》）都深度依赖命令模式来实现撤销/重做功能。

#### **1.6 使用建议与注意事项**

- **命令的粒度**: `UndoRedo` 对于属性修改和方法调用非常方便，但如果一个操作非常复杂，涉及到多个对象和状态的改变，将其封装在一个自定义的 `ICommand` 类中会更清晰。
- **性能考虑**: 在需要高性能的场景（例如，每秒产生数百个命令的弹幕游戏），频繁创建命令对象可能会导致内存分配压力和性能下降。在这种情况下，可以考虑结合 **对象池模式** 来复用命令对象，避免垃圾回收（GC）开销。
- **状态存储**: `UndoRedo` 存储的是属性的最终值。如果操作是相对的（例如 `MoveBy(10, 0)`），你需要自己计算好“执行”和“撤销”的最终位置。自定义命令对象可以更灵活地存储任何需要的数据。
- **异步操作**: 如果一个命令需要很长时间才能完成（例如，一个单位行走需要几秒钟），`Execute` 方法应该启动这个过程，但不应该阻塞。这通常通过启动一个Tween动画、一个Timer或者一个状态机来完成，并在过程结束后发出信号。

[GDScript版本待补充]

### 第2章 - 享元模式 (Flyweight)

#### **2.1 动机**

想象一下，你想在游戏中创建一个广阔的森林，里面有成千上万棵树。或者一个战场，上面布满了无数的草、石头和灌木。如果每一个对象（每一棵树、每一片草）都是一个独立的实例，拥有自己的模型（Mesh）、材质（Material）和贴图（Texture），内存消耗将会急剧上升，很快就会达到硬件的极限。

享元模式的目的是通过共享尽可能多的数据来最小化内存使用。它将一个对象的状态分为两部分：

- **内在状态 (Intrinsic State)**: 这是可以在多个对象之间共享的数据。对于一棵树来说，这可能是它的3D模型、树皮和树叶的贴图。这些数据对于同一种类的树来说是完全相同的。
- **外在状态 (Extrinsic State)**: 这是每个对象独有的数据，不能被共享。对于一棵树来说，这包括它的位置、旋转、缩放比例和当前的健康状况。每棵树在世界中的位置都是独一无二的。

享元模式就是将内在状态提取到一个单独的“享元对象”中，然后让所有原始对象持有对这个共享享元对象的引用。这样一来，成千上万棵树可以共享同一个模型和一套贴图，我们只需要为每棵树存储其独特的位置、旋转等外在状态即可。

#### **2.2 Godot中的实现方式：资源 (Resource)**

Godot的 **资源（Resource）** 系统是享元模式的完美原生实现。当你从磁盘加载一个资源时，例如 `var texture = GD.Load<Texture2D>("res://tree_bark.png")`，Godot会检查这个资源是否已经被加载过。如果已经加载，它会返回对现有资源的引用；如果尚未加载，它会加载资源，将其存储在缓存中，然后返回引用。

这意味着，无论你在多少个不同的节点中加载 `"res://tree_bark.png"`，内存中始终只有一份贴图数据。所有的`Sprite2D`或`MeshInstance3D`节点都共享这同一个资源实例。这同样适用于`Mesh`、`Material`、`AudioStream`以及我们接下来要创建的自定义资源。

利用这个机制，我们可以创建一个自定义资源来代表我们树的“类型”，即它的内在状态。

#### **2.3 C# 实现：创建森林**

我们将创建一个`TreeType`自定义资源来存储共享数据，然后创建一个`Tree`节点来表示世界中的每一棵树，它只存储自己的位置信息。

**1. 定义享元对象（自定义资源）**

创建一个`TreeType.cs`脚本，它继承自`Resource`。这个类将保存所有树共享的数据。

```csharp
// TreeType.cs
using Godot;

// [GlobalClass] 属性让这个自定义资源可以在Godot编辑器中被创建
[GlobalClass]
public partial class TreeType : Resource
{
    // 内在状态：所有同类树共享的数据
    [Export] public Mesh TreeMesh { get; private set; }
    [Export] public Material BarkMaterial { get; private set; }
    [Export] public Material LeavesMaterial { get; private set; }

    // 提供一个无参数的构造函数是Godot所必需的
    public TreeType() { }
}
```

**2. 在Godot编辑器中创建资源**

- 在文件系统面板中右键 -> 新建... -> 资源... -> 选择 `TreeType`。
- 将其保存为 `birch_tree_type.tres`。
- 在检查器中，为这个资源分配一个`Mesh`（例如一个`CylinderMesh`）和相应的材质。

![创建TreeType资源](https://i.imgur.com/example.png)  <-- (这是一个描述性的占位符，因为我们没有实际图像)

**3. 创建使用享元的外部对象**

现在创建`Tree.cs`脚本，它代表世界中的一棵具体的树。它将引用共享的`TreeType`资源。

```csharp
// Tree.cs
using Godot;

public partial class Tree : MeshInstance3D
{
    // 外在状态：每棵树独有的数据
    // 位置、旋转、缩放等Transform信息由Node3D基类自带
    public float Health { get; private set; } = 100.0f;

    private TreeType _treeType;

    public void Initialize(TreeType treeType, Vector3 position)
    {
        _treeType = treeType;
        Position = position;
        
        // 应用共享的内在状态
        this.Mesh = _treeType.TreeMesh;
        // 在Godot中，材质是Mesh的一部分，通常这样设置：
        // this.SetSurfaceMaterial(0, _treeType.BarkMaterial);
        // this.SetSurfaceMaterial(1, _treeType.LeavesMaterial);
    }
    
    public void TakeDamage(float amount)
    {
        Health -= amount;
    }
}
```

**4. 创建森林（客户端代码）**

最后，一个`ForestManager`节点负责在世界中生成成千上万棵树。

```csharp
// ForestManager.cs
using Godot;

public partial class ForestManager : Node3D
{
    [Export] private TreeType _birchTreeType; // 在编辑器中拖入 birch_tree_type.tres
    [Export] private int _treeCount = 5000;
    [Export] private float _forestAreaSize = 200.0f;

    public override void _Ready()
    {
        GenerateForest();
    }

    private void GenerateForest()
    {
        GD.Print($"Generating a forest with {_treeCount} trees...");
        
        for (int i = 0; i < _treeCount; i++)
        {
            var tree = new Tree();
            
            // 随机生成位置（外在状态）
            float x = (float)GD.RandRange(-_forestAreaSize / 2, _forestAreaSize / 2);
            float z = (float)GD.RandRange(-_forestAreaSize / 2, _forestAreaSize / 2);
            Vector3 position = new Vector3(x, 0, z);
            
            // 使用共享的TreeType进行初始化
            tree.Initialize(_birchTreeType, position);
            
            AddChild(tree);
        }
        
        GD.Print("Forest generation complete.");
        // 注意：内存占用远低于5000个独立模型和材质的总和
    }
}
```

#### **2.4 游戏案例**

- **渲染优化**: 如上例所示，用于渲染大量重复的场景装饰物，如植被、岩石、建筑等。这在开放世界游戏中尤为重要。
- **粒子系统**: Godot的`GPUParticles3D` / `GPUParticles2D` 将享元模式发挥到了极致。所有粒子共享相同的处理材质（Process Material）和贴图，只有每个粒子的生命周期、速度、颜色等外在状态是独立计算的，而且这些计算都在GPU上完成，效率极高。
- **瓦片地图 (TileMap)**: `TileMap` 是享元模式的另一个典型例子。整个地图可能由数百万个瓦片构成，但内存中只需要存储`TileSet`资源，其中包含每种瓦片的贴图和碰撞信息。每个瓦片在地图上的位置只是一个简单的坐标记录。

#### **2.5 使用建议与注意事项**

- **Godot已经为你做了很多**: 在使用Godot时，请记住其资源系统已经是享元模式的强大实现了。优先使用`Resource`来存储共享数据，而不是自己从头构建享元系统。
- **区分内在与外在**: 设计时最关键的一步是正确地区分哪些状态可以共享（内在），哪些必须是唯一的（外在）。
- **管理外在状态**: 享元模式以增加程序复杂性为代价来节省内存。你需要一个地方来存储和管理所有对象的外在状态（在我们的例子中，`ForestManager`扮演了这个角色）。
- **无法单独修改共享状态**: 修改一个享元对象（例如，改变`TreeType`中的`Mesh`）会立即影响到所有引用它的对象。这既是它的优点，也可能在不希望共享改变时成为缺点。如果需要一个独立副本，可以使用`Resource.Duplicate()`方法。

[GDScript版本待补充]

---

### 第3章 - 观察者模式 (Observer)

#### **3.1 动机**

在游戏中，不同系统之间需要频繁地进行通信。例如：
- 当玩家的生命值降低时，UI上的血条需要更新。
- 当一个敌人被消灭时，分数管理器需要增加分数，音效管理器需要播放爆炸声。
- 当玩家完成一个任务时，任务日志UI需要更新，同时可能会触发一个新的过场动画。

最糟糕的实现方式是让这些系统直接相互引用和调用。比如，让玩家角色 `Player` 持有对 `UI`、`ScoreManager`、`AudioManager` 的直接引用：

```csharp
// 反模式：紧耦合
public partial class Player : CharacterBody2D
{
    private UIManager _ui; // 强引用
    private ScoreManager _scoreManager; // 强引用
    
    public void TakeDamage(int amount)
    {
        _health -= amount;
        _ui.UpdateHealthBar(_health); // 直接调用
    }
    
    public void Die()
    {
        _scoreManager.AddScoreOnEnemyDeath(this); // 直接调用
        // ...
    }
}
```

这种方式会导致“意大利面条式代码”，系统之间高度耦合，难以维护和扩展。如果想添加一个新的系统来响应玩家死亡（比如一个成就系统），就必须修改`Player`类的代码。这违反了“开闭原则”。

观察者模式提供了一个完美的解决方案：定义一个“主题”（Subject）或“被观察者”，它维护一个“观察者”（Observer）列表。当主题的状态发生改变时，它会遍历并通知所有观察者，而无需知道观察者的具体身份或它们将如何响应。

#### **3.2 Godot中的实现方式：信号 (Signals)**

Godot将观察者模式提升为引擎的一等公民，其实现就是 **信号（Signals）**。在Godot中：
- **主题 (Subject)**: 任何 `GodotObject`（包括所有`Node`）都可以定义和发射信号。
- **观察者 (Observer)**: 任何 `GodotObject` 都可以监听（连接到）这些信号，并通过一个回调方法来响应。

信号系统是完全由引擎核心管理的，它高效、安全，并且是Godot推荐的解耦通信方式。使用C#时，信号被优雅地映射为C#的 **事件（events）**。

#### **3.3 C# 实现：玩家状态通知**

我们将创建一个`Player`，当其生命值改变或死亡时，会发射信号。然后一个`UIManager`会监听这些信号来更新界面。

**1. 在主题中定义信号**

在`Player.cs`中，我们使用`[Signal]`特性和`delegate`来定义信号。委托的命名约定是以`EventHandler`结尾。

```csharp
// Player.cs
using Godot;

public partial class Player : CharacterBody2D
{
    // 1. 定义信号
    // 当生命值改变时发射，传递旧值和新值
    [Signal]
    public delegate void HealthChangedEventHandler(int oldHealth, int newHealth);
    
    // 当玩家死亡时发射
    [Signal]
    public delegate void DiedEventHandler();

    private int _health = 100;
    public int Health
    {
        get => _health;
        set
        {
            int oldHealth = _health;
            _health = Mathf.Max(0, value);
            
            // 2. 发射信号
            EmitSignal(SignalName.HealthChanged, oldHealth, _health);
            
            if (_health == 0)
            {
                EmitSignal(SignalName.Died);
            }
        }
    }

    public override void _Input(InputEvent @event)
    {
        // 测试：按空格键扣血
        if (@event.IsActionPressed("ui_accept"))
        {
            TakeDamage(10);
        }
    }

    public void TakeDamage(int amount)
    {
        Health -= amount;
        GD.Print($"Player took {amount} damage. Current health: {Health}");
    }
}
```
`SignalName` 是Godot源生成器自动创建的静态类，它为我们提供了类型安全的信号名称，避免了使用裸字符串。

**2. 在观察者中连接并响应信号**

`UIManager`作为观察者，它不需要知道`Player`的内部实现，只需要连接到它感兴趣的信号即可。

```csharp
// UIManager.cs
using Godot;

public partial class UIManager : CanvasLayer
{
    private Label _healthLabel;
    private Player _player;

    public override void _Ready()
    {
        _healthLabel = GetNode<Label>("HealthLabel");
        // 假设Player节点在场景树中的路径是 /root/Main/Player
        _player = GetNode<Player>("/root/Main/Player");

        // 3. 连接信号到回调方法
        // 使用 += 操作符，就像连接标准的C#事件一样
        _player.HealthChanged += OnPlayerHealthChanged;
        _player.Died += OnPlayerDied;
        
        // 初始化UI
        OnPlayerHealthChanged(100, _player.Health);
    }

    // 4. 实现回调方法（信号处理器）
    private void OnPlayerHealthChanged(int oldHealth, int newHealth)
    {
        _healthLabel.Text = $"Health: {newHealth}";
        GD.Print($"UI Updated: Health is now {newHealth}");
    }

    private void OnPlayerDied()
    {
        _healthLabel.Text = "GAME OVER";
        GD.Print("UI Updated: Game Over message displayed.");
        // 在这里可以显示一个游戏结束画面
    }

    // 最佳实践：在节点退出场景树时断开连接，防止内存泄漏
    public override void _ExitTree()
    {
        _player.HealthChanged -= OnPlayerHealthChanged;
        _player.Died -= OnPlayerDied;
    }
}
```

**3. 全局事件总线 (Event Bus)**

对于需要全局广播的事件（例如 `GameOver`, `LevelCompleted`），直接让各个节点去引用某个特定的`Player`或`LevelManager`仍然会造成一定程度的耦合。一种更高级的模式是创建一个全局的“事件总线”。这通常通过 **单例模式（Autoload）** 实现。

```csharp
// EventBus.cs (在Godot中设置为Autoload)
using Godot;

public partial class EventBus : Node
{
    [Signal]
    public delegate void PlayerScoreChangedEventHandler(int newScore);
    
    [Signal]
    public delegate void GamePausedEventHandler(bool isPaused);
}
```

现在，任何节点都可以发射或监听这些全局事件，而无需知道事件的来源。

```csharp
// 在任何节点中发射信号
// EventBus.EmitSignal(EventBus.SignalName.PlayerScoreChanged, newScore);

// 在任何节点中监听信号
// EventBus.PlayerScoreChanged += (newScore) => { 
//     GD.Print($"Global score updated: {newScore}");
// };
```

#### **3.4 游戏案例**

- **成就系统**: 一个全局的 `AchievementSystem` 可以监听来自不同来源的信号，如`EnemyDefeated` (来自敌人), `ItemCrafted` (来自制造系统), `LevelCompleted` (来自关卡管理器)，从而实现完全解耦的成就触发。
- **音频系统**: `AudioManager` 可以监听 `PlayerShot`、`ExplosionOccurred`、`FootstepTaken` 等信号来播放相应的音效，而不需要被游戏逻辑代码直接调用。
- **UI系统**: 几乎所有UI元素都通过观察者模式工作。血条、弹药计数、任务列表、小地图等都会监听游戏世界中相应数据的变化信号。

#### **3.5 使用建议与注意事项**

- **信号 vs. 直接调用**: 如果两个对象天然就是紧密耦合的（例如，一个 `Player` 和它的 `AnimationPlayer`），直接调用通常更简单、性能也更好。信号主要用于解耦不同逻辑域的对象。
- **参数传递**: 信号可以传递参数。精心设计信号的参数，可以为观察者提供足够的上下文信息。
- **避免信号地狱**: 过度使用信号，或者创建很长的信号链（A发射信号给B，B再发射信号给C...），会使代码的逻辑流程变得难以追踪和调试。对于复杂的交互，可以考虑其他模式，如状态模式或更集中的管理器。
- **C#事件与Godot信号**: 当使用C#时，Godot信号和C#原生事件在语法上非常相似。关键区别在于Godot信号是引擎驱动的，能够跨语言（GDScript/C#）工作，并且可以在Godot编辑器中进行可视化连接。

[GDScript版本待补充]

### 第4章 - 原型模式 (Prototype)

#### **4.1 动机**

想象一下游戏中的一个怪物生成器。我们需要生成各种不同类型的怪物：有些是普通的哥布林，有些是精英哥布林（生命值更高），还有些是火焰哥布林（附带火焰攻击）。

一种方法是为每种怪物都创建一个类（`Goblin`, `EliteGoblin`, `FireGoblin`），然后在需要时用 `new` 关键字实例化它们。但当怪物种类繁多，或者怪物的配置需要由设计师在编辑器中调整而非硬编码时，这种方法就变得非常笨拙。

原型模式提供了一种更灵活的解决方案：我们不通过类来创建对象，而是通过 **克隆（cloning）** 或 **复制（copying）** 一个已有的实例来创建新对象。这个被复制的初始实例就叫做“原型”。

这种方法的好处是：
- **运行时配置**: 我们可以创建一个基础的“哥布林”原型，然后在运行时复制它，并根据需要修改副本的属性（例如增加生命值、添加火焰特效），从而创造出各种变体，而无需创建新的子类。
- **简化复杂对象的创建**: 如果一个对象的创建过程非常复杂（需要设置很多属性，组合多个子对象），我们可以先在编辑器里或代码中精心构建好一个原型。之后，创建新实例就只需要简单的一步“克隆”操作。

#### **4.2 Godot中的实现方式：PackedScene 和 `Instantiate()`**

Godot将原型模式深深地根植于其核心工作流中。在Godot中，最强大的原型就是 **场景（Scene）**。当你创建一个 `.tscn` 文件时，你实际上是在定义一个原型——一个包含了节点、组件、脚本和配置属性的完整节点树的原型。

引擎提供了一个专门的类来处理这种原型：`PackedScene`。当你加载一个`.tscn`文件时，你得到的就是一个`PackedScene`对象。然后，调用它的 `Instantiate()` 方法，就可以得到这个场景原型的一个全新副本。这正是原型模式的精髓所在。

此外，对于单个节点或资源，Godot也提供了`Duplicate()`方法来实现克隆。

#### **4.3 C# 实现：怪物生成器**

我们将创建一个怪物生成器，它使用`PackedScene`作为原型来实例化不同类型的敌人。

**1. 创建原型场景**

- 在Godot编辑器中，创建一个新的场景。
- 根节点命名为`Enemy` (例如，一个`CharacterBody2D`)。
- 为它添加子节点，如`Sprite2D`、`CollisionShape2D`和一个脚本`Enemy.cs`。
- 在检查器中配置好这个敌人的基础属性（例如，通过`@export`暴露出的`Health`, `Speed`等）。
- 将这个场景保存为 `enemy_prototype.tscn`。

```csharp
// Enemy.cs
using Godot;

public partial class Enemy : CharacterBody2D
{
    [Export] public int Health { get; set; } = 50;
    [Export] public float Speed { get; set; } = 100.0f;
    [Export] public PackedScene DeathEffect { get; set; } // 死亡特效原型

    public void Initialize(int health, float speed)
    {
        this.Health = health;
        this.Speed = speed;
    }

    public void Die()
    {
        if (DeathEffect != null)
        {
            Node2D effect = (Node2D)DeathEffect.Instantiate();
            GetParent().AddChild(effect);
            effect.GlobalPosition = this.GlobalPosition;
        }
        QueueFree();
    }
    
    // ... 其他逻辑，如 _PhysicsProcess ...
}
```

**2. 创建生成器（客户端代码）**

现在，`EnemySpawner`将加载这个原型，并用它来创建多种敌人变体。

```csharp
// EnemySpawner.cs
using Godot;

public partial class EnemySpawner : Node
{
    // 在编辑器中将 enemy_prototype.tscn 拖到这里
    [Export] private PackedScene _enemyPrototype;

    public override void _Ready()
    {
        // 生成一个普通哥布林
        SpawnEnemy(new Vector2(100, 100), 50, 100.0f);

        // 生成一个精英哥布林（原型的一个变体）
        SpawnEnemy(new Vector2(200, 100), 200, 80.0f, "Elite Goblin");

        // 生成一个快速哥布林（原型的另一个变体）
        SpawnEnemy(new Vector2(300, 100), 30, 200.0f, "Fast Goblin");
    }

    private void SpawnEnemy(Vector2 position, int health, float speed, string name = "Goblin")
    {
        if (_enemyPrototype == null) 
        {
            GD.PrintErr("Enemy prototype scene is not set!");
            return;
        }

        // 核心：从原型创建新实例
        Node instance = _enemyPrototype.Instantiate();
        
        // 类型安全转换
        if (instance is Enemy newEnemy)
        {
            newEnemy.Position = position;
            newEnemy.Name = name;
            
            // 自定义副本的属性
            newEnemy.Initialize(health, speed);

            AddChild(newEnemy);
            GD.Print($"Spawned a {name} with {health} HP and {speed} speed.");
        }
    }
}
```

#### **4.4 游戏案例**

- **几乎所有需要动态生成对象的场景**: 敌人、子弹、可拾取物品、特效粒子等，都非常适合使用`PackedScene`作为原型。
- **程序化内容生成 (PCG)**: 在程序化生成关卡时，墙壁、地板、装饰物等基本单元都可以作为原型，由算法来实例化和组合它们。
- **UI元素**: 动态创建列表项、弹出窗口或其他UI元素时，可以先在单独的场景文件中设计好原型，然后按需实例化。

#### **4.5 使用建议与注意事项**

- **PackedScene是首选**: 在Godot中，`PackedScene.Instantiate()`是实现原型模式的最佳方式。它比`Node.Duplicate()`更强大，因为它可以复制整个节点树，包括其子节点和所有配置。
- **`Duplicate()`方法的用途**: `Node.Duplicate()`适用于在运行时需要快速克隆单个节点及其子节点（不依赖于场景文件）的情况。你可以用它来实现类似“分裂”的敌人行为。
- **深拷贝 vs. 浅拷贝**: `Duplicate()`方法默认执行深拷贝，但对于资源（`Resource`），它只会复制引用（遵循享元模式）。如果你需要一个资源的唯一副本，必须调用`Resource.Duplicate()`。
- **初始化时机**: `Instantiate()`创建的节点在其被`AddChild()`添加到场景树之前，其`_Ready()`方法是不会被调用的。这给了我们一个宝贵的窗口期，可以在节点进入活动状态之前安全地修改其属性，如上面的`Initialize`方法所示。

[GDScript版本待补充]

---

### 第5章 - 单例模式 (Singleton)

#### **5.1 动机**

在任何大型软件中，总有一些组件是“独一无二”且需要被全局访问的。在游戏中，这些通常是高级管理器，例如：
- **`AudioManager`**: 一个统一控制所有背景音乐和音效播放的管理器。
- **`SceneManager`**: 负责加载、卸载和切换游戏场景，并处理场景间的过渡效果。
- **`GameManager` / `GameState`**: 存储全局游戏状态，如分数、玩家生命数、当前关卡等。
- **`EventBus`**: 一个全局事件总线，用于处理跨系统的全局事件（见观察者模式章节）。

单例模式确保一个类只有一个实例，并提供一个全局访问点来获取该实例。这避免了将这些管理器的实例作为参数在成百上千个函数调用中传来传去，简化了代码结构。

然而，传统的静态单例实现（例如，`public static MyManager Instance { get; }`）在游戏引擎中有许多弊端：生命周期不受引擎控制、难以进行初始化和清理、在场景切换时可能出现问题、并且不利用引擎的节点系统特性。

#### **5.2 Godot中的实现方式：自动加载 (Autoload)**

Godot提供了一个远比传统静态单例更优雅、更强大的解决方案：**自动加载（Autoload）**。

Autoload是一个注册在“项目设置”中的场景（`.tscn`）或脚本（`.cs` / `.gd`）。Godot会在游戏启动时，在场景树的根节点（root viewport）下自动实例化并添加这个节点。这个节点在整个游戏运行期间都存在，不会随着场景的切换而被销毁。

最重要的是，Autoload节点会被赋予一个全局唯一的名称，你可以像访问一个静态变量一样，从任何节点的任何脚本中直接通过这个名称访问它。

**Autoload的优势**: 
- **引擎管理的生命周期**: 它的`_Ready`, `_Process`, `_PhysicsProcess`, `_ExitTree`等生命周期方法都能正常工作。
- **全局可访问**: 像单例一样，但无需手动实现 `Instance` 属性。
- **本身是节点**: 它可以处理输入、拥有子节点、连接信号，完全融入Godot的节点系统。
- **配置简单**: 只需在项目设置中点击几下即可完成配置。

#### **5.3 C# 实现：全局游戏管理器**

我们将创建一个`GameManager`来追踪全局分数。

**1. 创建Autoload脚本**

```csharp
// GameManager.cs
using Godot;

public partial class GameManager : Node
{
    public int Score { get; private set; } = 0;

    [Signal]
    public delegate void ScoreChangedEventHandler(int newScore);

    public void AddScore(int amount)
    {
        Score += amount;
        EmitSignal(SignalName.ScoreChanged, Score);
        GD.Print($"Score is now: {Score}");
    }

    public void Reset()
    {
        Score = 0;
        EmitSignal(SignalName.ScoreChanged, Score);
        GD.Print("Score has been reset.");
    }
}
```

**2. 配置Autoload**

- 打开Godot编辑器，进入 **项目 -> 项目设置...**
- 切换到 **Autoload** 选项卡。
- **路径**: 点击文件夹图标，选择 `GameManager.cs` 文件。
- **节点名称**: Godot会自动填充为`GameManager`。**这就是它的全局名称**。
- 点击 **添加** 按钮。

![配置Autoload](https://i.imgur.com/example2.png)  <-- (这是一个描述性的占位符)

**3. 从任何地方访问单例**

现在，`GameManager` 已经是一个全局单例了。我们可以从任何其他脚本中访问它。

```csharp
// Enemy.cs (续)

public partial class Enemy : CharacterBody2D
{
    // ... 其他代码 ...
    [Export] private int _scoreValue = 10;
    
    public void Die()
    {
        // 获取Autoload单例
        GameManager gameManager = GetNode<GameManager>("/root/GameManager");
        gameManager.AddScore(_scoreValue);

        // ... 其他死亡逻辑 ...
        QueueFree();
    }
}

// HUD.cs (UI脚本)
public partial class HUD : CanvasLayer
{
    private Label _scoreLabel;

    public override void _Ready()
    {
        _scoreLabel = GetNode<Label>("ScoreLabel");
        
        // 获取Autoload单例并连接其信号
        GameManager gameManager = GetNode<GameManager>("/root/GameManager");
        gameManager.ScoreChanged += UpdateScoreLabel;
        
        // 初始化分数显示
        UpdateScoreLabel(gameManager.Score);
    }
    
    private void UpdateScoreLabel(int newScore)
    {
        _scoreLabel.Text = $"Score: {newScore}";
    }
}
```
路径 `/root/GameManager` 是访问Autoload节点的标准方式。

#### **4.4 游戏案例**

- **`AudioManager`**: 管理背景音乐和音效池。
- **`SaveManager`**: 处理游戏的保存和加载逻辑。
- **`TransitionManager`**: 控制场景切换时的淡入淡出或其他过渡效果。
- **`InputManager`**: 如果你需要一个比默认`Input`更复杂的输入系统（例如，支持按键重映射），可以将其做成单例。

#### **4.5 使用建议与注意事项**

- **Autoload是最佳选择**: 在Godot中，**始终优先使用Autoload来实现单例模式**。它比任何手写的静态单例都更健壮、更符合引擎的设计哲学。
- **避免滥用**: 单例模式是一把双刃剑。它虽然方便，但也引入了全局状态，使得代码单元测试变得困难，并可能隐藏依赖关系。在使用之前，请确认这个系统确实是全局唯一的，并且需要被广泛访问。
- **依赖注入作为替代**: 对于并非绝对需要全局访问的“管理器”，可以考虑 **依赖注入**。例如，一个`Level`节点可以在其`_Ready()`函数中，将其自身（作为`LevelManager`）的引用传递给它的子节点（如`Player`和`EnemySpawner`）。这种方式更利于解耦和测试。
- **初始化顺序**: 在项目设置中，Autoload列表的顺序决定了它们的实例化和`_Ready()`方法的调用顺序。如果你的单例之间有依赖关系（例如`SaveManager`依赖`GameManager`），请确保它们的顺序是正确的。

[GDScript版本待补充]

---

### 第6章 - 状态模式 (State)

#### **6.1 动机**

游戏中的角色或实体通常具有复杂的行为。一个玩家角色可以处于“站立”、“行走”、“奔跑”、“跳跃”、“下落”、“攻击”等多种状态。在不同的状态下，角色对输入的响应是不同的（例如，跳跃时不能再次跳跃），其物理行为也不同（例如，站立时静止，下落时受重力影响）。

一种简单粗暴的实现方式是使用大量的布尔变量（`isJumping`, `isAttacking`, `isRunning`...）和复杂的`if-else`分支结构：

```csharp
// 反模式：复杂的if-else结构
public override void _PhysicsProcess(double delta)
{
    if (_isJumping) {
        // 跳跃逻辑...
        if (_isAttacking) { /* 在空中攻击? */ }
    } else if (_isWalking) {
        // 行走逻辑...
    } else if (_isAttacking) {
        // 地面攻击逻辑...
    } else {
        // 站立逻辑...
    }
}
```

这种代码很快就会变得难以管理和扩展。每增加一种新状态，都可能需要修改所有现有的逻辑分支，极易引入bug。

状态模式通过将每一种状态的行为封装到独立的对象中来解决这个问题。主对象（例如`Player`）不再自己实现所有行为，而是持有一个对“当前状态”对象的引用，并将所有与状态相关的任务（如处理输入、更新物理）委托给它。当需要切换状态时，主对象只需要改变它所引用的状态对象即可。

#### **6.2 Godot中的实现方式**

在Godot中，状态模式主要有两种实现方式：

1.  **简单枚举状态机**: 对于状态较少、逻辑简单的实体，可以在单个脚本中使用一个`enum`来定义所有状态，然后在`_PhysicsProcess`中使用`switch`语句来处理当前状态的逻辑。这比复杂的`if-else`要整洁，但当状态逻辑变复杂时，这个`switch`语句依然会变得臃肿。

2.  **分层状态机（节点驱动）**: 这是更强大、更模块化的方法。我们创建一个抽象的`State`基类（通常是`Node`），然后让每个具体的状态（如`IdleState`, `WalkState`）都继承自它。`Player`节点下会有一个`StateMachine`子节点，而所有具体的状态节点都是`StateMachine`的子节点。`StateMachine`负责管理状态之间的切换。

我们将重点介绍更强大的第二种方法。

#### **6.3 C# 实现：分层状态机**

我们将为一个平台跳跃游戏的角色实现一个状态机。

**1. 定义State基类**

这个基类定义了所有状态共享的接口。每个状态都是一个独立的节点。

```csharp
// State.cs
using Godot;

public partial class State : Node
{
    // 状态机将把Player引用传递给每个状态，以便状态可以控制玩家
    protected Player player;

    public virtual void Enter() { }
    public virtual void Exit() { }
    public virtual void HandleInput(InputEvent @event) { }
    public virtual void Update(double delta) { }
    public virtual void PhysicsUpdate(double delta) { }
}
```

**2. 创建状态机管理器**

`StateMachine`节点负责持有和切换状态。

```csharp
// StateMachine.cs
using Godot;

public partial class StateMachine : Node
{
    [Export] private State _initialState;

    private State _currentState;
    private Player _player;

    public override void _Ready()
    {
        _player = GetOwner<Player>();
        // 将Player引用传递给所有子状态节点
        foreach (State child in GetChildren())
        {
            child.player = _player;
        }

        _currentState = _initialState;
        _currentState.Enter();
    }

    public void TransitionTo(State newState)
    {
        if (_currentState == newState || newState == null) return;

        _currentState.Exit();
        _currentState = newState;
        newState.Enter();
    }

    public override void _Input(InputEvent @event)
    {
        _currentState.HandleInput(@event);
    }

    public override void _Process(double delta)
    {
        _currentState.Update(delta);
    }

    public override void _PhysicsProcess(double delta)
    {
        _currentState.PhysicsUpdate(delta);
    }
}
```

**3. 创建具体状态**

现在我们为角色创建具体的状态，例如`IdleState`和`WalkState`。

```csharp
// IdleState.cs
using Godot;

public partial class IdleState : State
{
    public override void Enter()
    {
        player.AnimationPlayer.Play("Idle");
    }

    public override void PhysicsUpdate(double delta)
    {
        // 如果玩家开始移动，切换到行走状态
        if (player.Direction != Vector2.Zero)
        {
            player.StateMachine.TransitionTo(player.GetNode<State>("WalkState"));
        }

        // 如果玩家按下了跳跃键，切换到跳跃状态
        if (Input.IsActionJustPressed("jump"))
        {
           // player.StateMachine.TransitionTo(player.GetNode<State>("JumpState"));
        }
    }
}

// WalkState.cs
using Godot;

public partial class WalkState : State
{
    public override void Enter()
    {
        player.AnimationPlayer.Play("Walk");
    }

    public override void PhysicsUpdate(double delta)
    {
        player.Velocity = new Vector2(player.Direction.X * player.Speed, player.Velocity.Y);
        
        // 如果玩家停止移动，切换回站立状态
        if (player.Direction == Vector2.Zero)
        {
            player.StateMachine.TransitionTo(player.GetNode<State>("IdleState"));
        }
    }
}
```

**4. 组装Player场景**

- `Player` (CharacterBody2D)
  - `AnimationPlayer`
  - `CollisionShape2D`
  - `StateMachine` (附加`StateMachine.cs`脚本)
    - `IdleState` (附加`IdleState.cs`脚本)
    - `WalkState` (附加`WalkState.cs`脚本)
    - `JumpState` (附加`JumpState.cs`脚本)

在`StateMachine`节点的检查器中，将`Initial State`属性设置为`IdleState`节点。

```csharp
// Player.cs (主玩家脚本)
using Godot;

public partial class Player : CharacterBody2D
{
    [Export] public float Speed { get; private set; } = 200.0f;
    
    public StateMachine StateMachine { get; private set; }
    public AnimationPlayer AnimationPlayer { get; private set; }
    public Vector2 Direction { get; private set; }

    public override void _Ready()
    {
        StateMachine = GetNode<StateMachine>("StateMachine");
        AnimationPlayer = GetNode<AnimationPlayer>("AnimationPlayer");
    }

    public override void _PhysicsProcess(double delta)
    {
        Direction = Input.GetVector("move_left", "move_right", "move_up", "move_down");
        
        // 将物理处理委托给状态机
        // StateMachine._PhysicsProcess(delta); // Godot会自动调用

        MoveAndSlide();
    }
}
```

#### **6.4 游戏案例**

- **AI行为**: 状态模式是实现AI行为逻辑的黄金标准。一个敌人的AI可以有“巡逻”、“追击”、“攻击”、“逃跑”、“闲逛”等状态。
- **Boss战设计**: Boss战通常分为多个阶段，每个阶段Boss的行为模式和弱点都不同。每个阶段都可以是一个独立的状态。
- **UI流程管理**: 游戏菜单系统（主菜单 -> 选项菜单 -> 音频设置）也可以用状态模式来管理，每个屏幕是一个状态。
- **武器状态**: 玩家的武器可以有“就绪”、“开火”、“换弹”、“过热”等状态。

#### **6.5 使用建议与注意事项**

- **简单枚举 vs. 节点状态机**: 对于只有2-3个简单状态的实体，使用`enum`和`switch`就足够了。当状态逻辑变复杂，或者状态之间有共享逻辑（可以通过继承实现），或者你希望在编辑器中可视化地管理状态时，节点驱动的状态机是更好的选择。
- **状态通信**: 状态之间如何通信？一种方式是通过状态机进行中转。另一种方式是让状态直接引用它们可能需要转换到的其他状态节点，但这会增加耦合。`StateMachine.TransitionTo(GetNode<State>("..."))` 是一种折衷方案。
- **数据共享**: 状态需要访问和修改主对象（Player）的数据。在我们的实现中，通过将`Player`的引用传递给每个状态来实现这一点。确保状态只修改它应该负责的数据。
- **进入和退出逻辑**: `Enter()`和`Exit()`方法至关重要。`Enter()`用于执行进入状态时的一次性设置（如播放动画、启用碰撞体），`Exit()`则用于清理（如停止计时器、重置变量）。

[GDScript版本待补充]

---

## 第二部分：序列模式 (Sequencing Patterns)

游戏与其他软件最显著的区别之一在于它们是动态的、实时的。游戏世界中的时间在不断流逝，对象在持续运动和交互。序列模式正是用于组织这些与时间流和事件顺序相关的代码。本部分将探讨Godot引擎如何处理游戏循环、状态更新和同步，以及我们作为开发者如何利用这些模式来构建有序且高效的游戏逻辑。

### 第7章 - 双缓冲模式 (Double Buffer)

#### **7.1 动机**

在计算机图形学中，双缓冲是一个基础且关键的模式。想象一下只有一个屏幕缓冲区的场景：当GPU正在将新的一帧画面绘制到这个缓冲区时，显示器可能恰好正在从同一个缓冲区读取数据并将其发送到屏幕上。这会导致用户看到一个只画了一半的“撕裂”帧，产生闪烁或撕裂的视觉效果。

双缓冲模式通过使用两个缓冲区来解决这个问题：一个“**前台缓冲区**”（Front Buffer）和一个“**后台缓冲区**”（Back Buffer）。

1.  显示器始终只从前台缓冲区读取并显示完整的帧。
2.  CPU和GPU则在后台缓冲区中安静地绘制下一帧的全部内容。
3.  当后台缓冲区的新一帧绘制完成后，两个缓冲区进行一次“**交换**”（Swap）。后台缓冲区成为新的前台缓冲区，旧的前台缓冲区则成为下一个后台缓冲区，用于绘制再下一帧。

这个过程确保了显示器上显示的永远是一幅完整、无撕裂的图像。

#### **7.2 Godot中的实现方式**

对于游戏开发者来说，好消息是 **你几乎永远不需要手动实现图形的双缓冲**。Godot引擎的渲染服务器，连同底层的图形API（如Vulkan或OpenGL）和操作系统，已经为你完美地处理了这一切（通常甚至使用三缓冲来进一步提高性能）。

然而，双缓冲模式的 **核心思想** —— “在一个副本上进行计算，而在另一个稳定的副本上进行读取，然后一次性交换” —— 在游戏逻辑中依然非常有用，特别是在处理需要同步更新的大量实体时。例如：

- **物理模拟**: 当计算几百个物体的物理交互时，每个物体的下一步位置都依赖于其他物体当前的位置。如果在计算过程中直接修改物体的位置，那么计算顺序就会影响最终结果。使用双缓冲，我们可以从一个稳定的“当前状态”缓冲区读取所有物体的位置，并将计算出的“下一状态”写入一个独立的缓冲区，最后再统一应用所有更新。
- **细胞自动机/网格模拟**: 在像康威生命游戏这样的模拟中，每个细胞的下一个状态取决于其所有邻居的当前状态。如果你在遍历网格时直接修改细胞状态，那么这个修改会立即影响到后续邻居的计算，导致错误的结果。

#### **7.3 C# 实现：康威生命游戏**

我们将用C#在Godot中实现一个简单的康威生命游戏，来展示双缓冲模式在逻辑上的应用。

**1. 创建网格逻辑**

我们将创建一个`GameOfLifeLogic`类，它不关心渲染，只负责计算。它将使用两个二维数组作为前后缓冲区。

```csharp
// GameOfLifeLogic.cs
public class GameOfLifeLogic
{
    private bool[,] _frontBuffer;
    private bool[,] _backBuffer;
    private int _width;
    private int _height;

    public GameOfLifeLogic(int width, int height)
    {
        _width = width;
        _height = height;
        _frontBuffer = new bool[width, height];
        _backBuffer = new bool[width, height];
    }

    // 获取当前状态（只从前台缓冲区读取）
    public bool GetCell(int x, int y) => _frontBuffer[x, y];

    // 随机初始化状态
    public void Randomize(float probability = 0.5f)
    {
        for (int x = 0; x < _width; x++)
        {
            for (int y = 0; y < _height; y++)
            {
                _frontBuffer[x, y] = Godot.GD.Randf() < probability;
            }
        }
    }

    // 计算下一步状态
    public void AdvanceStep()
    {
        for (int x = 0; x < _width; x++)
        {
            for (int y = 0; y < _height; y++)
            {
                // 从前台缓冲区读取邻居状态
                int liveNeighbors = CountLiveNeighbors(x, y);
                bool currentState = _frontBuffer[x, y];
                bool nextState = false;

                if (currentState && (liveNeighbors == 2 || liveNeighbors == 3))
                {
                    nextState = true;
                }
                else if (!currentState && liveNeighbors == 3)
                {
                    nextState = true;
                }

                // 将新状态写入后台缓冲区
                _backBuffer[x, y] = nextState;
            }
        }

        // **核心：交换缓冲区**
        SwapBuffers();
    }

    private int CountLiveNeighbors(int x, int y)
    {
        int count = 0;
        for (int i = -1; i <= 1; i++)
        {
            for (int j = -1; j <= 1; j++)
            {
                if (i == 0 && j == 0) continue;
                int checkX = (x + i + _width) % _width; // 环形边界
                int checkY = (y + j + _height) % _height;
                if (_frontBuffer[checkX, checkY])
                {
                    count++;
                }
            }
        }
        return count;
    }

    private void SwapBuffers()
    {
        bool[,] temp = _frontBuffer;
        _frontBuffer = _backBuffer;
        _backBuffer = temp;
    }
}
```

**2. 创建渲染节点**

现在创建一个Godot节点来驱动逻辑并渲染结果。

```csharp
// GameOfLifeNode.cs
using Godot;

public partial class GameOfLifeNode : Node2D
{
    [Export] private int _gridWidth = 100;
    [Export] private int _gridHeight = 100;
    [Export] private float _updateInterval = 0.1f;
    
    private GameOfLifeLogic _logic;
    private Timer _timer;

    public override void _Ready()
    {
        _logic = new GameOfLifeLogic(_gridWidth, _gridHeight);
        _logic.Randomize();

        _timer = new Timer();
        _timer.WaitTime = _updateInterval;
        _timer.Timeout += OnTimerTimeout;
        AddChild(_timer);
        _timer.Start();
    }

    private void OnTimerTimeout()
    {
        _logic.AdvanceStep();
        // 触发重绘，告诉Godot的渲染系统需要更新视图
        QueueRedraw(); 
    }

    public override void _Draw()
    {
        // _Draw总是从一个稳定的状态（_frontBuffer）读取
        for (int x = 0; x < _gridWidth; x++)
        {
            for (int y = 0; y < _gridHeight; y++)
            {
                if (_logic.GetCell(x, y))
                {
                    DrawRect(new Rect2(x * 5, y * 5, 5, 5), Colors.White);
                }
            }
        }
    }
}
```

#### **7.4 使用建议与注意事项**

- **引擎已为你处理**: 重申一下，不要为渲染或物理手动实现双缓冲。Godot已经做了。
- **逻辑状态管理**: 当你需要在一帧内根据一组对象的当前状态计算它们所有对象的下一状态时，双缓冲模式的逻辑是你的首选工具。
- **内存开销**: 此模式的代价是需要双倍的内存来存储状态。对于非常大的数据集，需要评估这个开- **原子性**: 双缓冲确保了状态更新的原子性——所有对象的状态看起来是“同时”更新的。

[GDScript版本待补充]

---

### 第8章 - 游戏循环 (Game Loop)

#### **8.1 动机**

游戏循环是所有实时游戏的心脏。它是一个无限循环，在游戏运行时永不停止。每一轮循环，它都会处理玩家输入、更新游戏世界状态、并将其渲染到屏幕上。这个循环的速度决定了游戏的“帧率”（Frames Per Second, FPS）。

一个最简单的游戏循环看起来像这样：

```cpp
// 伪代码
while (gameIsRunning)
{
    processInput();
    updateGame();
    render();
}
```

然而，现代游戏循环要复杂得多。它需要处理可变的时间步长（即每帧花费的时间不同）、将物理更新与渲染更新分离、并以最高效的方式与硬件交互。

#### **8.2 Godot中的实现方式**

幸运的是，和双缓冲一样，**Godot引擎已经为我们实现并优化好了一个复杂而强大的游戏循环**。我们不需要自己写 `while(true)` 循环。相反，Godot为我们提供了特定的虚函数（生命周期方法），我们可以通过重写它们来将我们的代码“挂接”到游戏循环的特定阶段。

Godot的主循环分为两个关键的并行部分：

1.  **物理处理（Physics Processing）**: 
    - 以固定的时间步长运行（默认为每秒60次）。这个频率是恒定的，不受渲染帧率的影响。
    - 通过`_PhysicsProcess(double delta)`方法暴露给开发者。
    - **用途**: 所有与物理相关的代码（如移动、碰撞、重力）都应该放在这里，以保证物理模拟的稳定性和可预测性，不受帧率波动影响。

2.  **空闲处理（Idle Processing）**: 
    - 每一渲染帧运行一次。它的运行频率与当前帧率（FPS）相同。
    - 通过`_Process(double delta)`方法暴露给开发者。
    - **用途**: 用于处理非物理的逻辑，如图形效果、动画、UI更新、输入检测（如果不需要与物理同步）等。

此外，输入事件在它们自己的独立阶段被处理，并通过`_Input(InputEvent @event)`或`_UnhandledInput(InputEvent @event)`方法传递给节点。

#### **8.3 C# 实现：使用Godot的游戏循环钩子**

我们将创建一个简单的脚本来展示如何在C#中使用这些核心的生命周期方法。

```csharp
// PlayerController.cs
using Godot;

public partial class PlayerController : CharacterBody2D
{
    [Export] public float Speed = 250.0f;
    [Export] public float JumpVelocity = -400.0f;
    
    // 物理属性
    public float Gravity = ProjectSettings.GetSetting("physics/2d/default_gravity").AsSingle();
    
    private AnimatedSprite2D _animatedSprite;
    private float _nonPhysicsValue = 0.0f; // 用于在_Process中更新的变量

    public override void _Ready()
    {
        _animatedSprite = GetNode<AnimatedSprite2D>("AnimatedSprite2D");
    }

    // --- 输入事件处理 ---
    public override void _Input(InputEvent @event)
    {
        if (@event.IsActionPressed("shoot"))
        {
            GD.Print("Player shoots! (handled in _Input)");
        }
    }

    // --- 物理处理循环 ---
    public override void _PhysicsProcess(double delta)
    {
        Vector2 velocity = Velocity;

        // 应用重力
        if (!IsOnFloor())
            velocity.Y += Gravity * (float)delta;

        // 处理跳跃输入
        if (Input.IsActionJustPressed("jump") && IsOnFloor())
            velocity.Y = JumpVelocity;

        // 处理左右移动输入
        float direction = Input.GetAxis("move_left", "move_right");
        velocity.X = direction * Speed;

        Velocity = velocity;
        MoveAndSlide();
        
        UpdateAnimation(direction);
    }

    // --- 空闲/渲染处理循环 ---
    public override void _Process(double delta)
    {
        // 这里的逻辑每帧运行一次，与FPS同步
        // 适合做不影响物理逻辑的视觉效果
        _nonPhysicsValue += (float)delta;
        Modulate = new Color(1, 1, 1, 0.8f + Mathf.Sin(_nonPhysicsValue * 5) * 0.2f); // 创建一个轻微的脉动效果
    }
    
    private void UpdateAnimation(float direction)
    {
        if (direction != 0)
        {
            _animatedSprite.Play("run");
            _animatedSprite.FlipH = direction < 0;
        } 
        else
        {
            _animatedSprite.Play("idle");
        }
        
        if (!IsOnFloor())
        {
             _animatedSprite.Play("jump");
        }
    }
}
```

#### **8.4 使用建议与注意事项**

- **物理 vs. 渲染**: 严格区分`_PhysicsProcess`和`_Process`的用途是编写稳定可靠的Godot代码的关键。**经验法则是：如果代码会影响一个物体在游戏世界中的位置或物理状态，就把它放在`_PhysicsProcess`中。**
- **`delta`参数**: `delta`参数代表自上次调用该函数以来经过的时间（以秒为单位）。在进行任何随时间变化的计算（如速度、加速度）时，**务必乘以`delta`**，以确保游戏行为在不同帧率的机器上表现一致。
- **输入处理**: `_Input`会在`_Process`和`_PhysicsProcess`之前被调用。对于需要立即响应的事件（如UI点击、射击），可以在`_Input`中处理。对于需要影响物理状态的持续性输入（如移动），通常在`_PhysicsProcess`中使用`Input.GetAxis`或`Input.IsActionPressed`来轮询状态。
- **暂停游戏**: 你可以通过`GetTree().Paused = true`来暂停游戏循环。默认情况下，这只会暂停`_Process`，而`_PhysicsProcess`会继续运行。你可以通过设置节点的`ProcessMode`属性来改变单个节点在暂停时的行为。

[GDScript版本待补充]

---

### 第9章 - 更新方法 (Update Method)

#### **9.1 动机**

当游戏中有成百上千个独立实体（如敌人、子弹、NPC）时，我们如何管理它们每一帧的行为？

一种方法是创建一个巨大的`GameWorld`类，它包含所有实体的列表，并在其主循环中遍历这个列表，为每个实体调用相应的AI、移动等逻辑：

```csharp
// 反模式：臃肿的中心管理器
class GameWorld 
{
    private List<Enemy> _enemies;
    private List<Bullet> _bullets;

    void Update(double delta) 
    {
        // 更新所有子弹
        foreach (Bullet b in _bullets) 
        {
            b.X += b.VelocityX * delta;
            b.Y += b.VelocityY * delta;
            // ...碰撞检测等...
        }

        // 更新所有敌人
        foreach (Enemy e in _enemies)
        {
           // ...AI和移动逻辑...
        }
    }
}
```
这种方式非常不符合面向对象的设计原则。`GameWorld`类变得无所不知、无所不能，承担了过多的责任。添加一种新型实体就需要修改这个庞大的`Update`方法，违反了开闭原则。

更新方法模式提出了一种更优雅、更符合面向对象思想的方案：**让每个对象自己负责自己的行为**。我们为每个游戏实体类定义一个`Update`方法。然后，游戏循环不再需要知道每个对象的具体类型和行为，它要做的唯一一件事就是遍历一个通用的游戏对象列表，并调用每个对象的`Update`方法。

#### **9.2 Godot中的实现方式**

**更新方法模式是Godot节点系统的核心工作方式**。当你在一个节点的脚本中实现`_Process(double delta)`或`_PhysicsProcess(double delta)`时，你实际上就是在应用更新方法模式。

Godot的场景树（`SceneTree`）扮演了那个“通用游戏对象列表”的角色。在每一帧的游戏循环中，场景树会自动遍历所有活动的节点，并调用它们各自的`_Process`或`_PhysicsProcess`方法。这使得行为被完美地封装在它们所属的节点中。

#### **9.3 C# 实现：自管理的子弹**

让我们看一个子弹的例子。子弹的行为非常简单：被发射出去，然后沿着一个方向直线飞行，直到击中物体或飞出屏幕。

```csharp
// Bullet.cs
using Godot;

public partial class Bullet : Area2D
{
    [Export] private float _speed = 800.0f;

    private Vector2 _direction = Vector2.Up;

    // 这个方法由发射者调用，用于设置子弹的初始状态
    public void Start(Vector2 position, float directionDegrees)
    {
        this.Position = position;
        this.RotationDegrees = directionDegrees;
        _direction = Vector2.Up.Rotated(Mathf.DegToRad(directionDegrees));
    }

    // 更新方法：每一物理帧，子弹自己更新自己的位置
    public override void _PhysicsProcess(double delta)
    {
        // 核心逻辑：封装在对象内部
        Position += _direction * _speed * (float)delta;
    }

    // 当子弹飞出屏幕时自我销毁
    private void OnVisibleOnScreenNotifier2DScreenExited()
    {
        QueueFree();
    }

    // 当子弹击中物体时自我销毁
    private void OnBodyEntered(Node2D body)
    {
        // 在这里可以添加击中效果的逻辑
        if (body is Enemy) // 假设有Enemy类
        {
            // ((Enemy)body).TakeDamage(10);
        }
        QueueFree(); 
    }
}
```

在这个例子中，`Bullet`类封装了它自己的全部生命周期逻辑：
-   如何移动 (`_PhysicsProcess`)
-   何时消失 (`OnVisibleOnScreenNotifier2DScreenExited`, `OnBodyEntered`)

创建它的`Player`或`Enemy`节点不需要在自己的`_Process`方法中去管理这颗子弹的飞行。它只需要在需要时实例化子弹，调用`Start()`，然后就可以“发射后不管”了。这极大地简化了发射者的代码，并将复杂性分散到各自负责的实体中。

#### **9.4 使用建议与注意事项**

- **封装是关键**: 更新方法模式的威力在于封装。将一个实体的所有行为逻辑都放在它自己的脚本中，可以让你更容易地理解、修改和复用这个实体。
- **善用`delta`**: 再次强调，为了使行为与帧率无关，所有随时间变化的计算（位移、旋转、缩放、冷却计时等）都必须乘以`delta`。
- **性能**: 当场景中有成千上万个节点都在执行`_Process`时，可能会有性能开销。Godot对此做了优化，但对于极端情况（例如，数万个单位的RTS游戏），你可能需要考虑数据驱动的方法（如实体组件系统-ECS）或使用服务器（如`RenderingServer`, `PhysicsServer`）来批量处理对象。这些是更高级的优化模式，我们将在后续章节探讨。
- **启用/禁用行为**: 你可以通过设置`Node.ProcessMode`属性或直接调用`SetProcess(false)` / `SetPhysicsProcess(false)`来随时启用或禁用一个节点的更新方法，这对于优化不可见或非活动对象非常有用。

[GDScript版本待补充]

---

## 第三部分：行为模式 (Behavioral Patterns)

当游戏世界的实体数量和复杂性增加时，管理它们各自的行为就成了主要挑战。行为模式专注于对象之间的通信以及如何有效地分配职责。它们帮助我们定义清晰的通信渠道，并以灵活、可维护的方式封装实体的行为逻辑，避免代码变得混乱和僵化。

### 第10章 - 字节码 (Bytecode)

#### **10.1 动机**

想象一下，你想为一个RPG游戏设计一个复杂的法术系统。一个“火球术”可能包含以下步骤：
1. 在施法者手中生成一个火焰粒子效果。
2. 播放一段施法音效。
3. 等待1秒钟。
4. 发射一个火球射弹。
5. 在目标点击中时，播放爆炸效果和音效。

我们可以为每个法术硬编码一个C#方法。但如果游戏有上百个法术，并且设计师希望在不请求程序员帮助、不重新编译游戏的情况下，就能轻松调整甚至创造新法术呢？

字节码模式通过 **将行为定义为数据** 来解决这个问题。我们定义一套简单的、底层的“指令集”，然后将复杂的行为（如一个法术或一段NPC对话）表示为这些指令的序列。游戏运行时，一个“虚拟机”（VM）或“解释器”会读取这个指令序列并执行它。

这就像为你的游戏特性创造一种专用的“脚本语言”，但远比集成一个完整的脚本语言（如Lua）要简单得多。其核心优势是 **沙箱化** 和 **数据驱动**。设计师可以在安全受限的环境中定义逻辑，而这些逻辑可以作为游戏数据（如JSON或资源文件）被加载和修改。

#### **10.2 Godot中的实现方式**

从技术上讲，GDScript本身就是被编译成一种内部字节码来执行的。但为游戏逻辑从头编写一个完整的字节码VM是一项庞大的任务。在Godot中，我们可以用更简单、更实用的方式来应用字节码模式的 *精神*：**创建一个指令序列解释器**。

我们可以使用Godot的`Resource`或简单的`Array[Dictionary]`来定义指令集，然后用一个C#类来解释并执行这个指令序列。

#### **10.3 C# 实现：数据驱动的NPC对话**

我们将创建一个简单的系统，让设计师可以通过资源文件来定义一段NPC的交互行为，包括对话、给予物品和检查玩家状态。

**1. 定义指令资源**

我们先创建代表单个指令的`Resource`脚本。这比用字典更类型安全，并且在编辑器中体验更好。

```csharp
// Instruction.cs
using Godot;

[GlobalClass]
public partial class Instruction : Resource
{
    // 可以用一个Enum来代替字符串，以获得更好的类型安全
    [Export] public string Command { get; set; } 
}

// SayInstruction.cs
[GlobalClass]
public partial class SayInstruction : Instruction
{
    [Export] public string CharacterName { get; set; }
    [Export(PropertyHint.MultilineText)] public string Text { get; set; }
    public SayInstruction() { Command = "say"; }
}

// GiveItemInstruction.cs
[GlobalClass]
public partial class GiveItemInstruction : Instruction
{
    [Export] public string ItemId { get; set; } // 假设有一个物品系统
    [Export] public int Amount { get; set; } = 1;
    public GiveItemInstruction() { Command = "give_item"; }
}
```

**2. 创建行为序列资源**

现在创建一个资源来容纳指令序列。

```csharp
// BehaviorSequence.cs
using Godot;
using Godot.Collections;

[GlobalClass]
public partial class BehaviorSequence : Resource
{
    [Export] public Array<Instruction> Instructions { get; set; }
}
```

**3. 在编辑器中创建行为**

- 在文件系统中，右键创建一个`BehaviorSequence`资源，命名为`npc_greeting.tres`。
- 在检查器中，为`Instructions`数组添加元素。
- 对于每个元素，点击“<空>” -> “新建Instruction” -> 选择`SayInstruction`或`GiveItemInstruction`。
- 填充指令的属性，例如说一段话，然后给一个物品。

**4. 创建解释器**

解释器负责执行这个行为序列。

```csharp
// BehaviorInterpreter.cs
using System.Threading.Tasks;
using Godot;

public partial class BehaviorInterpreter : Node
{
    private UIManager _uiManager; // 假设有一个UI管理器来显示对话
    private Inventory _inventory; // 假设有一个库存系统

    public override void _Ready()
    {
        // 在实际项目中，这些管理器应该是单例或通过依赖注入获得
        _uiManager = GetNode<UIManager>("/root/UIManager");
        _inventory = GetNode<Inventory>("/root/Inventory");
    }

    public async Task Execute(BehaviorSequence sequence)
    {
        if (sequence == null) return;

        foreach (Instruction instruction in sequence.Instructions)
        {
            switch (instruction.Command)
            {
                case "say":
                    var say = instruction as SayInstruction;
                    // 等待玩家点击“继续”
                    await _uiManager.ShowDialogue(say.CharacterName, say.Text);
                    break;

                case "give_item":
                    var give = instruction as GiveItemInstruction;
                    _inventory.AddItem(give.ItemId, give.Amount);
                    break;

                // 在这里可以添加更多指令，如 'wait', 'play_sound', 'check_quest' 等
                default:
                    GD.PrintErr($"Unknown instruction command: {instruction.Command}");
                    break;
            }
        }
    }
}
```

现在，任何NPC都可以拥有一个`BehaviorInterpreter`并执行一个`BehaviorSequence`资源，从而实现了行为和逻辑的分离。

#### **10.4 游戏案例**

- **法术系统**: 《上古卷轴》或《龙腾世纪》中的复杂法术，其效果（如伤害、debuff、视觉效果）可以通过指令序列来定义。
- **任务系统**: 任务的目标和步骤（如“和NPC交谈”、“收集10个熊皮”、“到达某个地点”）可以被编码为指令序列。
- **过场动画**: 简单的过场动画（角色移动到某点、说一句话、镜头聚焦）可以用指令序列来编排。
- **卡牌游戏**: 卡牌的效果（抽一张牌、对敌人造成3点伤害、召唤一个单位）是字节码模式的绝佳应用场景。

#### **10.5 使用建议与注意事项**

- **保持指令集简单**: 字节码模式的威力在于组合简单的指令。不要让单个指令变得过于复杂。
- **安全性**: 这种模式的美妙之处在于它是完全沙箱化的。解释器是你写的，所以你可以完全控制数据能做什么、不能做什么，不会有安全风险。
- **异步操作**: 对于需要时间的操作（如等待、播放动画），解释器需要支持`async/await`或信号，以避免在等待时阻塞整个游戏。
- **Godot的替代方案**: 对于更复杂的逻辑，可以考虑使用Godot的内置`Expression`类，它可以安全地执行数学和逻辑表达式字符串。

[GDScript版本待补充]

---

### 第11章 - 子类沙箱 (Subclass Sandbox)

#### **11.1 动机**

当使用继承来定义多种游戏实体（如不同的敌人、武器或技能）时，我们常常会遇到一个问题：基类变得越来越臃肿。为了让子类能够实现各种行为，我们可能会在基类中塞入大量底层的功能接口，例如直接访问物理、音频和粒子系统的方法。 

这会带来两个问题：
1.  **高耦合**: 子类与引擎的许多底层系统产生了紧密耦合。如果未来要重构音频系统，可能需要修改所有使用到音频的子类。
2.  **不安全**: 子类被赋予了过大的“权力”，它可以轻易地做出一些危险的操作，比如移除错误的游戏对象、播放不该播放的音效，或者导致物理系统崩溃。

子类沙箱模式通过在基类中提供一套高级、受限的“沙箱方法”来解决这个问题。子类只能通过调用这些由基类提供的安全方法来定义其行为，而无法触及底层系统。基类为所有子类创建了一个安全、易于使用的“游乐场”或“沙箱”。

#### **11.2 Godot中的实现方式**

在Godot中，这个模式非常自然。我们可以创建一个`abstract`或`partial`的基类（例如`BaseEnemy.cs`或`BaseSpell.cs`）。这个基类会持有对`AnimationPlayer`、`AudioStreamPlayer`等节点的引用，并提供一组`protected`（即仅对子类可见）的沙箱方法。子类则重写一个核心的`virtual`方法（如`_OnExecute()`），并在其中调用这些沙箱方法来构建自己的逻辑。

#### **11.3 C# 实现：超能力系统**

我们将创建一个`Superpower`基类，它提供沙箱方法。然后创建两个具体的超能力：`FireBlast`和`Teleport`。

**1. 创建基类和沙箱**

`Superpower.cs`基类负责与引擎系统交互，并提供沙箱。

```csharp
// Superpower.cs
using Godot;

public abstract partial class Superpower : Node
{
    protected CharacterBody2D _owner; // 拥有此超能力的角色

    public void Initialize(CharacterBody2D owner)
    {
        _owner = owner;
    }

    // 子类必须重写此方法来定义行为
    public abstract void Execute();

    // --- 沙箱方法 --- //

    protected void PlayAnimation(string animationName)
    {
        // 基类负责找到并安全地操作AnimationPlayer
        AnimationPlayer animPlayer = _owner.GetNode<AnimationPlayer>("AnimationPlayer");
        if (animPlayer != null)
        {
            animPlayer.Play(animationName);
        }
    }

    protected void PlaySound(AudioStream sound, float volumeDb = 0.0f)
    {
        // 基类负责安全地播放声音
        // 实际项目中会通过AudioManager单例来播放
        AudioStreamPlayer2D player = new AudioStreamPlayer2D();
        player.Stream = sound;
        player.VolumeDb = volumeDb;
        player.Finished += () => player.QueueFree(); // 播放完后自动清理
        _owner.AddChild(player);
    }

    protected void SpawnParticles(PackedScene particleScene)
    {
        if (particleScene == null) return;
        GpuParticles2D particles = (GpuParticles2D)particleScene.Instantiate();
        particles.Position = _owner.Position;
        _owner.GetParent().AddChild(particles);
    }
    
    protected Godot.Collections.Array<Node2D> FindEnemiesInRadius(float radius)
    {
        // 提供一个安全的方法来查询周围的敌人，而不是让子类直接访问物理系统
        var query = new PhysicsShapeQueryParameters2D();
        var shape = new CircleShape2D { Radius = radius };
        query.Shape = shape;
        query.Transform = new Transform2D(0, _owner.GlobalPosition);
        // ...设置碰撞层等
        var results = GetWorld2D().DirectSpaceState.IntersectShape(query);
        // ...过滤出敌人...
        return new Godot.Collections.Array<Node2D>(); // 返回结果
    }
}
```

**2. 创建沙箱化的子类**

现在，创建`FireBlast`就变得非常简单和安全。它只需要调用基类提供的沙箱方法即可。

```csharp
// FireBlast.cs
using Godot;

public partial class FireBlast : Superpower
{
    [Export] private PackedScene _explosionParticles;
    [Export] private AudioStream _explosionSound;
    [Export] private float _damageRadius = 100.0f;

    public override void Execute()
    {
        // 完全在沙箱内工作
        GD.Print("Executing FireBlast!");
        PlayAnimation("cast_fire");
        PlaySound(_explosionSound);
        SpawnParticles(_explosionParticles);

        var enemies = FindEnemiesInRadius(_damageRadius);
        foreach (var enemy in enemies)
        {
            // ((Enemy)enemy).TakeDamage(50);
        }
    }
}

// Teleport.cs
using Godot;

public partial class Teleport : Superpower
{
    [Export] private PackedScene _teleportEffect;
    [Export] private float _teleportDistance = 300.0f;

    public override void Execute()
    {
        GD.Print("Executing Teleport!");
        PlayAnimation("disappear");
        SpawnParticles(_teleportEffect);

        // 安全地修改owner的位置
        _owner.Position += Vector2.Right.Rotated(_owner.Rotation) * _teleportDistance;

        // 也可以有另一个appear动画和效果
    }
}
```
子类代码非常清晰，只关注“做什么”，而不关心“怎么做”。

#### **11.4 游戏案例**

- **技能/法术系统**: 如上例，是子类沙箱最经典的应用。
- **敌人AI**: 创建一个`BaseAI`类，提供沙箱方法如`MoveTowardsPlayer()`, `Attack()`, `FindCover()`。具体的敌人AI子类（如`MeleeAI`, `RangedAI`）则通过组合这些沙箱方法来定义其行为模式。
- **Mod支持**: 如果你的游戏支持Mod，这个模式至关重要。你可以将沙箱API暴露给Mod作者，让他们可以在不破坏游戏核心逻辑的情况下创建新内容。

#### **11.5 使用建议与注意事项**

- **精心设计API**: 沙箱的质量取决于你提供的API。好的沙箱API应该易于使用、功能强大且难以被误用。
- **平衡灵活性与安全性**: 过于严格的沙箱会限制创造力，而过于宽松的沙箱则会失去其保护作用。你需要找到一个合适的平衡点。
- **不要破坏沙箱**: 作为基类，一旦提供了沙箱，就应该避免让子类有其他途径去接触底层系统。例如，将底层节点的引用设为`private`而不是`protected`。

[GDScript版本待补充]

---

### 第12章 - 类型对象 (Type Object)

#### **12.1 动机**

当游戏中的实体种类繁多，但它们共享相同的核心行为时，纯粹的继承会变得非常笨拙。想象一个有数百种不同怪物的RPG游戏。我们可能会创建这样一个继承树：
`Monster` -> `Goblin`, `Orc`, `Dragon`
`Goblin` -> `GoblinMage`, `GoblinWarrior`, `GoblinShaman`

很快，类的数量就会爆炸式增长。每增加一个微小的变种（比如“冰霜哥布林萨满”），都可能需要创建一个新子类。这种做法的主要问题是：**它将“类型”和“类”这两个概念混为一谈**。一个“类型”应该是通过其 **数据** 来定义的，而不是通过硬编码的 **类**。

类型对象模式通过将“类型”的定义从类中分离出来，放到一个独立的“类型对象”中来解决这个问题。现在，我们只需要一个`Monster`类。每个`Monster`实例都包含一个对其“类型对象”的引用。这个类型对象存储了该怪物类型所有共享的属性，如最大生命值、攻击力、模型、叫声、掉落物等。

#### **12.2 Godot中的实现方式**

这个模式在Godot中实现起来非常优雅，它完美地结合了 **享元模式** 和 **原型模式** 的思想。我们的“类型对象”就是一个 **自定义资源（`Resource`）**。

- **类型对象**: 我们创建一个`MonsterType.cs`脚本，继承自`Resource`。这个资源将包含所有同种怪物共享的数据。
- **主体对象**: 我们创建一个`Monster.cs`脚本（附加到一个`CharacterBody2D/3D`节点上）。这个节点将持有一个对`MonsterType`资源的引用，并根据其类型数据来配置自己。

这样做的好处是，设计师现在可以通过创建和配置新的`.tres`资源文件来创造出无数种新怪物，**完全不需要编写一行新代码**。

#### **12.3 C# 实现：数据驱动的怪物系统**

**1. 定义类型对象（自定义资源）**

```csharp
// MonsterType.cs
using Godot;

[GlobalClass]
public partial class MonsterType : Resource
{
    [Export] public string Name { get; set; } = "Monster";
    [Export] public int MaxHealth { get; set; } = 100;
    [Export] public int AttackDamage { get; set; } = 10;
    [Export] public float Speed { get; set; } = 100.0f;
    
    [Export] public Texture2D Texture { get; set; }
    [Export] public AudioStream GruntSound { get; set; }
    // 还可以有更复杂的数据，比如一个掉落表资源
    // [Export] public LootTableResource LootTable { get; set; }
}
```

**2. 在编辑器中创建类型**

- 在文件系统面板中，右键创建多个`MonsterType`资源，例如`goblin.tres`和`orc.tres`。
- 分别编辑这两个资源文件，为它们配置不同的属性（生命值、伤害、贴图等）。

**3. 创建主体对象**

`Monster`类现在变得非常通用。它不关心自己是哥布林还是兽人，它只知道如何根据其`MonsterType`来行动。

```csharp
// Monster.cs
using Godot;

public partial class Monster : CharacterBody2D
{
    [Export] public MonsterType Type { get; private set; }

    // 实例特有的数据（外在状态）
    private int _currentHealth;
    
    private Sprite2D _sprite;

    public override void _Ready()
    {
        if (Type == null)
        {
            GD.PrintErr("Monster has no Type assigned!");
            QueueFree();
            return;
        }

        // 根据类型对象来配置自身
        _currentHealth = Type.MaxHealth;
        _sprite = GetNode<Sprite2D>("Sprite2D");
        _sprite.Texture = Type.Texture;
        
        this.Name = Type.Name;
    }

    public void TakeDamage(int amount)
    {
        _currentHealth -= amount;
        if (_currentHealth <= 0)
        {
            Die();
        }
    }

    public void Die()
    {
        GD.Print($"{Type.Name} has died.");
        QueueFree();
    }
    
    public override void _PhysicsProcess(double delta)
    {
        // 使用类型对象中的数据来驱动行为
        // var velocity = direction * Type.Speed;
        // MoveAndSlide();
    }
}
```

**4. 使用**

- 创建一个`Monster`场景，将`Monster.cs`脚本附加到根节点上。
- 在`Monster`节点的检查器中，将`Type`属性拖入我们创建的`goblin.tres`或`orc.tres`文件。
- 现在，将这个`Monster`场景拖入主世界中，它就会表现为哥布林或兽人。你甚至可以在运行时动态地改变它的`Type`资源，从而实现“怪物变身”的效果。

#### **12.4 游戏案例**

- **RPG中的任何事物**: 怪物、物品、技能、装备、任务... 任何有大量种类变体的东西都适合用类型对象模式来管理。
- **策略游戏中的单位**: 《星际争霸》中的每个单位（陆战队员、坦克）都可以是一个通用的`Unit`实例，其具体属性由各自的`UnitType`对象定义。
- **赛车游戏中的车辆**: 不同的赛车有不同的引擎、轮胎、悬挂。这些都可以是`CarType`资源中的属性。

#### **12.5 使用建议与注意事项**

- **类型对象 vs. 子类**: 如果不同类型之间的 **行为** 有巨大差异（例如，一个怪物的AI是飞行，另一个是钻地），那么使用继承和子类可能更合适。如果差异主要在于 **数据**（属性、数值、资源引用），那么类型对象是完美的选择。
- **与组件模式结合**: 你可以让类型对象包含该类型需要哪些组件的信息。例如，`MonsterType`可以有一个导出数组，指定这个怪物应该附加`FireAttackComponent`还是`IceAttackComponent`。
- **热重载**: 使用`Resource`作为类型对象的一大优势是，你可以在游戏运行时修改`.tres`文件，这些改动会立刻反映在游戏中（如果资源被正确地缓存和重载），这对于快速迭代和调试非常有价值。

[GDScript版本待补充]

---

## 第四部分：解耦模式 (Decoupling Patterns)

随着游戏项目规模的增长，最大的敌人往往是代码的复杂性和耦合度。当一个系统的改动会像涟漪一样扩散到其他几十个系统中时，维护和扩展就成了一场噩梦。解耦模式的目标就是斩断这些不必要的依赖关系，让系统的各个部分可以独立地开发、测试和修改。本部分将介绍的模式是构建大型、健壮游戏架构的基石。

### 第13章 - 组件 (Component)

#### **13.1 动机**

在传统的面向对象设计中，我们习惯于使用继承来共享代码。例如，一个游戏可能有这样的继承树：

- `GameObject`
  - `MovingObject` (继承自GameObject，增加了速度和方向)
    - `Player` (继承自MovingObject)
    - `Enemy` (继承自MovingObject)
      - `FlyingEnemy` (继承自Enemy，改变了移动逻辑)

这种方式在项目初期看起来很清晰，但很快就会暴露其致命缺陷：**僵化**。如果现在我们想创建一个既能移动又能说话的NPC，但它不能被攻击，该怎么办？我们可能需要创建一个新的`TalkableMovingObject`类。如果一个东西既能被渲染，又能被物理引擎处理，但不能移动呢？这种组合爆炸会导致类的数量急剧增多，形成一个难以理解和维护的“死亡继承菱形”。

组件模式提出了一个革命性的思想：**组合优于继承**。它不再让一个对象“是”一个东西，而是让它“拥有”一些东西。一个游戏对象变成了一个简单的“属性容器”（通常称为实体，Entity），而它所有的功能——渲染、物理、AI、输入控制——都由独立的、可插拔的“组件”对象来提供。

现在，要创建一个会飞的、会说话的、有AI的敌人，我们只需要创建一个空的实体，然后给它插上`PhysicsComponent`、`RenderComponent`、`AIComponent`和`DialogueComponent`即可。

#### **13.2 Godot中的实现方式：节点树 (Node Tree)**

**组件模式是Godot引擎设计的绝对核心**。如果你理解了Godot的节点和场景系统，那么你已经在使用组件模式了。

- **实体 (Entity)**: 在Godot中，任何一个`Node`（特别是`Node2D`, `Node3D`或`Control`）都可以作为一个实体容器。
- **组件 (Component)**: 组件就是被添加为实体节点的 **子节点** 的其他节点。每个节点都专注于一项单一的功能。

一个典型的Godot“玩家”实体，其场景树结构就完美地诠释了组件模式：
- `Player` (`CharacterBody2D`): 实体根节点，负责整合所有组件。
  - `Sprite2D`: **渲染组件**，负责显示玩家的图像。
  - `CollisionShape2D`: **物理形状组件**，定义玩家的物理边界。
  - `AnimationPlayer`: **动画组件**，管理所有动画。
  - `Camera2D`: **相机组件**，让镜头跟随玩家。
  - `HealthComponent` (`Node`): 一个自定义脚本组件，负责管理生命值。
  - `InputComponent` (`Node`): 一个自定义脚本组件，负责处理玩家输入。

这种结构让我们可以通过在编辑器中添加、移除或替换子节点（组件）来轻松地组合和修改游戏对象的功能。

#### **13.3 C# 实现：组合式AI敌人**

我们将创建一个敌人，它的行为不是由一个巨大的`Enemy.cs`脚本定义的，而是由多个可复用的组件脚本组合而成。

**1. 创建组件脚本**

每个组件都是一个独立的`Node`，并附加一个处理单一职责的脚本。

```csharp
// HealthComponent.cs
using Godot;

public partial class HealthComponent : Node
{
    [Signal] public delegate void DiedEventHandler();
    [Export] public int MaxHealth { get; private set; } = 100;
    
    private int _currentHealth;

    public override void _Ready() => _currentHealth = MaxHealth;

    public void TakeDamage(int amount)
    {
        _currentHealth = Mathf.Max(0, _currentHealth - amount);
        if (_currentHealth == 0) EmitSignal(SignalName.Died);
    }
}

// WanderMovementComponent.cs
using Godot;

public partial class WanderMovementComponent : Node
{
    [Export] private float _wanderRadius = 50.0f;
    [Export] private float _speed = 50.0f;

    private CharacterBody2D _body;
    private Vector2 _wanderTarget;
    private Timer _timer;

    public override void _Ready()
    {
        _body = GetOwner<CharacterBody2D>();
        _timer = new Timer { WaitTime = GD.RandRange(2.0, 5.0), OneShot = false };
        _timer.Timeout += SetNewWanderTarget;
        AddChild(_timer);
        _timer.Start();
        SetNewWanderTarget();
    }

    public override void _PhysicsProcess(double delta)
    {
        _body.Velocity = _body.GlobalPosition.DirectionTo(_wanderTarget) * _speed;
        _body.MoveAndSlide();
        if (_body.GlobalPosition.DistanceTo(_wanderTarget) < 5.0f) SetNewWanderTarget();
    }

    private void SetNewWanderTarget()
    {
        _wanderTarget = _body.GlobalPosition + new Vector2((float)GD.RandRange(-1.0, 1.0), (float)GD.RandRange(-1.0, 1.0)).Normalized() * _wanderRadius;
    }
}
```

**2. 组装实体**

现在，在编辑器中创建`Enemy`场景：
- `Enemy` (`CharacterBody2D`)
  - `Sprite2D`
  - `CollisionShape2D`
  - `HealthComponent` (附加`HealthComponent.cs`)
  - `WanderMovementComponent` (附加`WanderMovementComponent.cs`)

**3. 实体主脚本（协调器）**

`Enemy`节点的主脚本非常简单，它的主要职责是获取对其组件的引用，并协调它们之间的交互（通常通过信号）。

```csharp
// Enemy.cs
using Godot;

public partial class Enemy : CharacterBody2D
{
    private HealthComponent _healthComponent;

    public override void _Ready()
    {
        _healthComponent = GetNode<HealthComponent>("HealthComponent");
        _healthComponent.Died += OnDied;
    }

    private void OnDied()
    {
        GD.Print("Enemy died!");
        QueueFree();
    }
}
```

现在，如果我们想创建一个会追逐玩家而不是四处游荡的敌人，我们不需要创建新的子类。我们只需要创建一个新的`ChaseMovementComponent.cs`，然后在编辑器里将`WanderMovementComponent`替换成`ChaseMovementComponent`即可。功能被完全解耦了。

#### **13.4 游戏案例**

- **所有Godot游戏**: Godot的整个设计哲学就是基于组件模式。
- **《塞尔达传说：旷野之息》**: 游戏中的所有物体（敌人、NPC、武器、食物）都是由各种组件（物理、AI、可交互、可烹饪等）组合而成的实体，提供了极高的系统性玩法自由度。
- **Unity引擎**: 和Godot类似，Unity也使用基于组件的设计。

#### **13.5 使用建议与注意事项**

- **拥抱Godot的方式**: 在Godot中，使用子节点作为组件是自然且正确的方式。不要试图在一个脚本中实现所有功能。
- **组件间通信**: 组件之间应尽量保持解耦。最佳的通信方式是通过其所有者（Owner）节点发射信号。例如，`InputComponent`不应该直接调用`MovementComponent`的方法，而应该发射一个`MovementRequested`信号，让`Player`主脚本监听并决定如何响应。
- **获取组件引用**: 使用`GetNode<T>("NodeName")`是标准的获取方式。为了性能，应该在`_Ready`方法中获取一次并将其缓存在一个成员变量中，而不是在`_Process`中反复获取。
- **场景 vs. 脚本组件**: 你可以将一个组件保存为独立的`.tscn`文件，也可以只是一个附加在空`Node`上的`.cs`文件。前者更灵活，后者更轻量。

[GDScript版本待补充]

---

### 第14章 - 事件队列 (Event Queue)

#### **14.1 动机**

在观察者模式中，主题（Subject）在状态改变时会立即、同步地调用所有观察者（Observer）的方法。这在大多数情况下都很好用。但有时，这种即时性会带来问题：

1.  **性能尖峰**: 如果一个事件（比如爆炸）导致几十个对象同时被销毁，而每个对象的销毁逻辑都很复杂（播放声音、创建粒子、更新UI），这可能会导致游戏在那一帧突然卡顿。
2.  **顺序依赖**: 当多个观察者监听同一个事件时，它们的调用顺序是不确定的。如果一个观察者的行为依赖于另一个观察者的行为，就会产生问题。
3.  **递归修改**: 如果一个观察者在响应事件时，又触发了同一个事件（例如，一个对象在受到伤害时，其装备反弹了伤害，又对攻击者触发了“受到伤害”事件），这可能导致无限递归或难以追踪的bug。

事件队列通过在发送者和接收者之间引入一个 **异步的中间层** 来解决这些问题。发送者不再直接调用接收者的方法，而是将一个代表事件的“消息”对象放入一个中央队列中。游戏循环会在稍后的一个安全时间点（例如，在每帧的末尾）处理这个队列中的所有事件。

这种方式将事件的 **发送** 和 **处理** 在时间上解耦了。

#### **14.2 Godot中的实现方式**

Godot没有一个现成的全局事件队列系统，但使用我们已经学过的模式可以非常容易地构建一个。我们可以创建一个 **单例（Autoload）** 作为全局的`EventQueue`。

此外，对于需要延迟一帧执行的简单操作，Godot提供了一个内置的微型事件队列：`Callable.CallDeferred()`。当你调用一个`Callable`的`CallDeferred`方法时，Godot会把它放入一个队列，并在当前帧的所有处理（物理、逻辑等）完成后再执行它。这对于避免在物理迭代过程中修改场景树（例如，`QueueFree()`）等不安全操作非常有用。

#### **14.3 C# 实现：全局事件队列**

我们将创建一个全局的、异步的事件队列。

**1. 定义事件数据结构**

最好用一个类或结构体来封装事件数据。

```csharp
// GameEvent.cs
using Godot;

// 事件类型枚举
public enum GameEventType
{
    EnemyDied,
    ItemCollected,
    PlayerLeveledUp
}

// 事件数据基类
public partial class GameEvent : RefCounted
{
    public GameEventType Type { get; protected set; }
}

// 具体事件数据
public partial class EnemyDiedEvent : GameEvent
{
    public string EnemyName { get; private set; }
    public int ScoreValue { get; private set; }
    public EnemyDiedEvent(string name, int score) 
    {
        Type = GameEventType.EnemyDied;
        EnemyName = name;
        ScoreValue = score;
    }
}
```

**2. 创建EventQueue单例**

创建一个`EventQueue.cs`脚本，并将其设置为Autoload。

```csharp
// EventQueue.cs (设置为Autoload)
using Godot;
using System.Collections.Generic;

public partial class EventQueue : Node
{
    [Signal] public delegate void EventProcessedEventHandler(GameEvent gameEvent);

    private Queue<GameEvent> _eventQueue = new Queue<GameEvent>();

    // 任何系统都可以调用这个方法来发送事件
    public void EnqueueEvent(GameEvent gameEvent)
    {
        _eventQueue.Enqueue(gameEvent);
    }

    // 在每帧的末尾处理队列中的所有事件
    public override void _Process(double delta)
    {
        while (_eventQueue.Count > 0)
        {
            GameEvent gameEvent = _eventQueue.Dequeue();
            // 广播事件，让监听者处理
            EmitSignal(SignalName.EventProcessed, gameEvent);
        }
    }
}
```

**3. 发送和接收事件**

现在，任何节点都可以向队列发送事件，任何节点也都可以监听队列的处理信号。

```csharp
// Enemy.cs (发送者)
public partial class Enemy : CharacterBody2D
{
    private void Die()
    {
        // 创建事件数据
        var diedEvent = new EnemyDiedEvent(this.Name, 10);
        // 发送到队列，然后“发射后不管”
        GetNode<EventQueue>("/root/EventQueue").EnqueueEvent(diedEvent);
        QueueFree();
    }
}

// ScoreManager.cs (接收者)
public partial class ScoreManager : Node
{
    public override void _Ready()
    {
        // 监听事件队列
        GetNode<EventQueue>("/root/EventQueue").EventProcessed += OnEventProcessed;
    }

    private void OnEventProcessed(GameEvent gameEvent)
    {
        // 检查事件类型
        if (gameEvent is EnemyDiedEvent diedEvent)
        {
            AddScore(diedEvent.ScoreValue);
        }
    }
    
    // ... 其他逻辑
}
```

#### **14.4 游戏案例**

- **音频系统**: `AudioManager`可以监听事件队列。当一个`EnemyDiedEvent`被处理时，它可以检查事件中的敌人类型，然后播放相应的死亡音效。这避免了每个敌人都需要直接引用`AudioManager`。
- **成就系统**: `AchievementSystem`可以监听队列，并在处理`ItemCollectedEvent`或`PlayerLeveledUpEvent`时检查是否满足某个成就的条件。
- **多人游戏**: 在网络游戏中，来自服务器的输入或状态更新可以被视为事件放入一个队列中，由客户端在适当的时候平滑地处理，而不是瞬间应用所有变化。

#### **14.5 使用建议与注意事项**

- **同步 vs. 异步**: 信号是同步的，事件队列是异步的。如果发送者需要立即知道事件处理的结果，请使用信号。如果发送者只是想“广播一个通知”而不在乎谁接收以及何时接收，事件队列是更好的选择。
- **`CallDeferred()`**: 对于简单的延迟操作（特别是从物理线程安全地修改场景树），优先使用`Callable.CallDeferred()`。例如，`QueueFree()`的内部实现就使用了`CallDeferred`。
- **性能**: 事件队列本身有很小的开销，但它通过将工作负载分散到多个帧或集中到帧的某个固定时间点来平滑性能，从而避免卡顿。
- **事件数据**: 保持事件数据对象尽量小，只包含必要的信息。

[GDScript版本待补充]

---

### 第15章 - 服务定位器 (Service Locator)

#### **15.1 动机**

我们在单例模式中讨论过，游戏中通常需要一些全局可访问的系统或“服务”，如`AudioManager`、`SaveManager`等。单例模式（在Godot中通过Autoload实现）是解决这个问题的一种直接方法。

但单例模式也有其缺点：
1.  **硬编码依赖**: 代码通过一个全局可用的硬编码名称（如`GameManager`）来访问单例。这使得代码与该具体的实现类紧密耦合。
2.  **测试困难**: 当你测试一个依赖`AudioManager`的类时，你无法轻易地用一个“假的”或“模拟的”音频管理器来代替真正的实例。测试会变得复杂，因为它会真的尝试播放声音。

服务定位器模式提供了一个折衷方案。它仍然提供一个全局可访问的对象（“定位器”），但这个定位器本身不实现任何服务逻辑。相反，它是一个 **注册表**。其他服务（如`AudioManager`）在启动时向这个定位器注册自己。当代码需要一个服务时，它向定位器请求该服务。

这种间接性带来了巨大的好处：**我们可以改变服务定位器提供的具体服务实现，而无需修改任何使用该服务的代码**。例如，在测试时，我们可以让定位器提供一个什么都不做的`DummyAudioManager`，而不是真正的`AudioManager`。

#### **15.2 Godot中的实现方式**

和事件队列一样，服务定位器在Godot中也很容易通过 **Autoload** 实现。我们可以创建一个名为`Services`或`Game`的Autoload脚本，它作为全局的服务定位器。在游戏启动时，其他管理器（无论是Autoload还是场景中的节点）可以找到这个定位器并向其注册自己。

#### **15.3 C# 实现：一个灵活的服务注册表**

**1. 定义服务接口 (可选但推荐)**

为了达到最佳的解耦效果，我们应该面向接口编程。客户端代码只知道它需要一个`IAudioService`，而不关心具体实现。

```csharp
// IAudioService.cs
public interface IAudioService
{
    void PlaySound(AudioStream sound);
    void PlayMusic(AudioStream music);
}
```

**2. 创建服务定位器**

创建一个`Services.cs`脚本并设为Autoload。

```csharp
// Services.cs (设置为Autoload)
using Godot;
using System.Collections.Generic;

public partial class Services : Node
{
    // 单例实例，以便我们可以从静态属性访问
    public static Services Instance { get; private set; }
    
    // 服务注册表
    private Dictionary<System.Type, object> _services = new Dictionary<System.Type, object>();

    public override void _Ready()
    {
        Instance = this;
    }

    // 注册服务
    public void Register<T>(object service) where T : class
    {
        GD.Print($"Registering service: {typeof(T).Name}");
        _services[typeof(T)] = service;
    }

    // 获取服务
    public T Get<T>() where T : class
    {
        if (_services.TryGetValue(typeof(T), out object service))
        {
            return service as T;
        }
        GD.PrintErr($"Service not found: {typeof(T).Name}");
        return null;
    }

    // 便捷的静态访问器
    public static IAudioService Audio => Instance.Get<IAudioService>();
}
```

**3. 创建并注册服务**

现在创建`AudioManager`。它可以是另一个Autoload，也可以是主场景中的一个普通节点。

```csharp
// AudioManager.cs (也可以是Autoload)
using Godot;

public partial class AudioManager : Node, IAudioService
{
    public override void _Ready()
    {
        // 向服务定位器注册自己
        Services.Instance.Register<IAudioService>(this);
    }

    public void PlaySound(AudioStream sound) => GD.Print($"Playing sound: {sound.ResourcePath}");
    public void PlayMusic(AudioStream music) => GD.Print($"Playing music: {music.ResourcePath}");
}

// DummyAudioManager.cs (用于测试)
public class DummyAudioManager : IAudioService
{
    public void PlaySound(AudioStream sound) { /* 什么都不做 */ }
    public void PlayMusic(AudioStream music) { /* 什么都不做 */ }
}
```

**4. 使用服务**

现在，任何代码都可以通过服务定位器来获取服务，而无需知道其具体实现。

```csharp
// Player.cs
public partial class Player : CharacterBody2D
{
    public void Jump()
    {
        // 通过服务定位器获取音频服务
        Services.Audio?.PlaySound(_jumpSound); // 使用 ?. 来安全处理服务可能不存在的情况
    }
}
```

在测试环境中，我们可以在启动时注册`DummyAudioManager`而不是`AudioManager`，这样`Player`的单元测试就不会因为播放声音而失败或变慢。

#### **15.4 游戏案例**

- **跨平台实现**: 假如你的游戏需要支持不同的平台API（例如，Steam、Xbox、PlayStation的成就系统）。你可以定义一个`IAchievementService`接口，然后为每个平台创建一个具体的实现类。在游戏启动时，根据当前运行的平台，向服务定位器注册正确的实现。
- **Mod支持**: Mod作者可以创建他们自己的服务实现（例如，一个全新的经济系统`IModdedEconomy`），并将其注册到服务定位器中，让游戏的其他部分可以使用。
- **依赖注入框架的简化版**: 服务定位器是依赖注入（Dependency Injection, DI）的一种简单形式。它有助于减少硬编码的依赖关系。

#### **15.5 使用建议与注意事项**

- **服务定位器 vs. 单例**: 如果你的服务永远不会有第二个实现（例如，一个管理全局游戏状态的`GameManager`），并且你不需要为它提供模拟实现来进行测试，那么直接使用Autoload单例更简单。如果服务有多种可能的实现，或者你需要测试它，服务定位器是更好的选择。
- **隐藏依赖**: 和单例一样，服务定位器也可能隐藏一个类的依赖关系。从一个方法的签名中，你看不出它内部调用了`Services.Audio`。这可能会使代码的依赖关系变得不那么明确。
- **初始化顺序**: 服务的注册必须在使用之前完成。通常，所有服务都在游戏启动的早期（例如在各自的`_Ready`方法中）进行注册。使用Autoload的顺序可以帮助控制这一点。
- **接口是关键**: 服务定位器模式的威力在与接口结合时才能最大化。尽量让客户端代码依赖于接口（`IAudioService`）而不是具体类（`AudioManager`）。

[GDScript版本待补充]

---

## 第五部分：优化模式 (Optimization Patterns)

在游戏开发中，尤其是在实时游戏中，性能不是一个可有可无的选项，而是核心功能之一。优化模式专注于解决性能瓶颈，它们提供了一些聪明的技巧来减少CPU或内存的负载。这些模式可能不会让你的代码更优雅或更易于理解——有时甚至恰恰相反——但它们能让你的游戏从卡顿的幻灯片变成流畅的交互体验。使用这些模式时，关键在于“测量”：首先找到性能瓶颈，然后才应用优化。

### 第16章 - 数据局部性 (Data Locality)

#### **16.1 动机**

现代CPU的计算速度快得惊人，但它们的速度远远超过了从主内存（RAM）中获取数据的速度。为了弥补这个鸿沟，CPU内置了多级高速缓存（L1, L2, L3 Cache）。当CPU需要一个数据时，它会首先查看缓存。如果数据在缓存中（称为“缓存命中”，Cache Hit），获取速度极快。如果不在（称为“缓存未命中”，Cache Miss），CPU就不得不去访问慢速的RAM，并在这个过程中产生数百个时钟周期的等待，这极大地浪费了CPU的计算能力。

CPU在从RAM加载数据时，并不会只加载所需的那一个字节，而是会加载一个连续的数据块（称为“缓存行”，Cache Line，通常是64字节）。**数据局部性**模式的核心思想就是：**组织你的数据，以便当CPU处理一个数据时，它接下来要处理的数据已经顺便被加载到缓存中了。**

这意味着，处理一个紧密排列的数组，远比处理一个元素分散在内存各处的链表要快得多。这引出了“数据驱动设计”（Data-Oriented Design）的核心原则：**代码的结构应该跟随数据的结构**。

#### **16.2 Godot中的实现方式**

在C#中，数据局部性主要体现在 **`class`（引用类型）** 和 **`struct`（值类型）** 的区别上。

- 当你创建一个`class`的数组时：`MyClass[] objects = new MyClass[1000];`，这个数组本身在内存中是连续的，但它只存储了1000个指向`MyClass`实例的 **引用（指针）**。而`MyClass`实例本身则散落在内存的各个角落（堆上）。遍历这个数组来处理数据会导致大量的缓存未命中。
- 当你创建一个`struct`的数组时：`MyStruct[] objects = new MyStruct[1000];`，这个数组在内存中是 **一整块连续的内存**，所有`MyStruct`实例的数据都紧密地排列在一起。遍历这个数组将获得极佳的缓存命中率。

因此，在Godot C#中应用数据局部性模式，关键在于对性能要求极高的系统中，使用`struct`数组来组织数据。

#### **16.3 C# 实现：粒子系统性能对比**

我们将创建一个简单的粒子系统，并对比两种数据组织方式的性能。

**场景1：面向对象的方式 (Array of Classes)**

```csharp
// ParticleObject.cs
public class ParticleObject
{
    public Vector2 Position; // class实例散落在内存中
    public Vector2 Velocity;
}

// ParticleSystem_OOP.cs
public void Update(double delta)
{
    for (int i = 0; i < _particles.Length; i++)
    {
        _particles[i].Position += _particles[i].Velocity * (float)delta;
    }
}
```

**场景2：数据驱动的方式 (Arrays of Structs)**

```csharp
// ParticleSystem_DOD.cs
private Vector2[] _positions;
private Vector2[] _velocities;

public void Update(double delta)
{
    // _positions和_velocities数组各自在内存中是连续的
    for (int i = 0; i < _particleCount; i++)
    {
        _positions[i] += _velocities[i] * (float)delta;
    }
}
```

**性能测试节点**

```csharp
// PerformanceTestNode.cs
using Godot;
using System.Diagnostics;

public partial class PerformanceTestNode : Node
{
    private const int PARTICLE_COUNT = 500000;

    // ... (ParticleObject和两个Update方法的定义) ...

    public override void _Ready()
    {
        var stopwatch = new Stopwatch();
        
        // 测试OOP方法
        var particlesOOP = new ParticleObject[PARTICLE_COUNT];
        for(int i=0; i<PARTICLE_COUNT; ++i) particlesOOP[i] = new ParticleObject();
        stopwatch.Start();
        UpdateOOP(particlesOOP, 0.016f);
        stopwatch.Stop();
        GD.Print($"OOP approach took: {stopwatch.ElapsedMilliseconds} ms");

        // 测试DOD方法
        var positionsDOD = new Vector2[PARTICLE_COUNT];
        var velocitiesDOD = new Vector2[PARTICLE_COUNT];
        stopwatch.Restart();
        UpdateDOD(positionsDOD, velocitiesDOD, 0.016f);
        stopwatch.Stop();
        GD.Print($"DOD approach took: {stopwatch.ElapsedMilliseconds} ms");
    }
    // ... UpdateOOP 和 UpdateDOD 的实现 ...
}
```

**结果**: 在处理大量数据时，数据驱动的方式（DOD）通常会比面向对象的方式（OOP）快几倍甚至一个数量级，因为它最大化了数据局部性。

#### **16.4 使用建议与注意事项**

- **不要过早优化**: 数据局部性优化会使代码的可读性变差。只在性能分析确定了瓶颈之后，才在关键的热点代码路径上应用此模式。
- **ECS框架**: 实体组件系统（Entity Component System, ECS）是将数据局部性原则应用到极致的架构模式。Godot本身不是ECS引擎，但社区中有一些C#的ECS库（如Arch）可以集成进来，用于构建超高性能的系统。
- **Godot API**: 当你调用Godot引擎的API时（例如`MoveAndSlide`），数据会从C#的托管内存编组到引擎的非托管内存。这个过程本身有开销。因此，数据局部性优化主要适用于纯C#代码中的密集计算循环。

[GDScript版本待补充]

---

### 第17章 - 脏标记 (Dirty Flag)

#### **17.1 动机**

游戏中有许多计算非常昂贵，我们不希望每一帧都去执行它们。例如：

- 一个单位的最终攻击力取决于其基础攻击力、武器加成、光环效果、临时药水效果等。每次攻击时都重新计算一遍非常浪费，因为这些属性通常只在玩家更换装备或获得/失去buff时才会改变。
- 一个复杂的UI布局，如果每一帧都重新计算所有元素的位置和大小，会消耗大量CPU资源，而实际上只有当窗口大小改变或添加/删除UI元素时，才需要重新计算。

脏标记模式通过一个简单的布尔标记（“dirty flag”）来解决这个问题。当源数据发生变化时，我们将这个标记设置为`true`。需要使用计算结果的代码在运行时会检查这个标记：如果标记为`false`，则直接使用上一次缓存的结果；如果标记为`true`，则执行昂贵的计算，更新缓存的结果，然后将标记重置为`false`。

这是一种典型的 **延迟计算（lazy evaluation）** 策略。

#### **17.2 Godot中的实现方式**

这个模式是一种逻辑模式，可以在任何需要的地方轻松实现。在C#中，通常通过一个私有的布尔字段和一个公共的属性或方法来暴露计算结果。

#### **17.3 C# 实现：角色属性计算**

我们将为一个RPG角色创建一个属性计算系统，只有在装备或状态改变时才重新计算最终属性。

```csharp
// CharacterStats.cs
using Godot;

public partial class CharacterStats : Node
{
    private bool _statsAreDirty = true;
    private Dictionary<string, float> _cachedFinalStats = new Dictionary<string, float>();

    private float _baseAttack = 10;
    private float _weaponAttack = 0;

    // 当源数据改变时，设置脏标记
    public void EquipWeapon(float weaponAttackValue)
    {
        _weaponAttack = weaponAttackValue;
        MarkAsDirty();
    }

    // 公共访问器
    public float GetFinalAttack()
    {
        // 如果数据是“脏”的，则重新计算
        if (_statsAreDirty)
        {
            RecalculateStats();
        }
        return _cachedFinalStats["attack"];
    }

    private void RecalculateStats()
    {
        GD.Print("Recalculating expensive stats...");
        // 这是一个昂贵的计算过程
        _cachedFinalStats["attack"] = _baseAttack + _weaponAttack; 
        // ... 计算其他所有属性 ...

        // 计算完成后，清除脏标记
        _statsAreDirty = false;
    }
    
    private void MarkAsDirty()
    {
        _statsAreDirty = true;
    }
}
```

现在，你可以多次调用`GetFinalAttack()`，但昂贵的`RecalculateStats()`只会在第一次调用或调用`EquipWeapon()`之后执行一次。

#### **17.4 游戏案例**

- **UI布局**: Godot的`Control`节点内部就使用了脏标记的思想。只有当大小、位置或内容改变时，它们才会触发重绘，而不是每一帧都重绘。
- **导航网格 (Navigation Mesh)**: 当场景中的静态障碍物（如墙壁）发生变化时，需要重新烘焙导航网格。这是一个非常昂贵的操作，可以通过脏标记来触发。
- **渲染**: 在3D渲染中，如果一个模型的位置没有改变，它的模型-世界变换矩阵就不需要每帧都重新计算。

#### **17.5 使用建议与注意事项**

- **确定成本**: 只对那些经过性能分析确定为真正“昂贵”的计算使用脏标记。对于简单的计算，直接执行的开销可能比检查和管理标记的开销还要小。
- **线程安全**: 如果在多线程环境中使用脏标记，需要确保对标记的读写是原子操作，以避免竞态条件。
- **标记的传播**: 有时一个对象的“脏”状态依赖于另一个对象。例如，角色的最终属性依赖于装备，如果装备的属性变了，角色也应该被标记为“脏”的。你需要管理好这种依赖链。

[GDScript版本待补充]

---

### 第18章 - 对象池 (Object Pool)

#### **18.1 动机**

在许多游戏中，我们需要频繁地创建和销毁大量相同的对象。最典型的例子就是射击游戏中的 **子弹**。玩家或敌人可能在短时间内发射成百上千颗子弹。如果每一颗子弹都通过`new`或`Instantiate()`来创建，并在击中或飞出屏幕后通过`QueueFree()`销毁，会带来两个严重的性能问题：

1.  **内存分配开销**: 频繁地向操作系统请求和释放内存是一个相对较慢的操作，可能导致内存碎片。
2.  **垃圾回收 (GC)**: 在像C#这样的托管语言中，被销毁的对象不会立即释放内存，而是等待垃圾回收器（GC）来清理。当GC运行时，它可能会暂停整个程序的执行，导致游戏出现明显的 **卡顿或掉帧**。这是游戏开发中的大忌。

对象池模式通过 **重用对象** 来解决这个问题。它维护一个“池子”，里面装着一堆预先分配好的、非活动的对象。当需要一个新对象时，我们不创建新的，而是从池子中“租借”一个，并将其激活。当这个对象不再需要时，我们不销毁它，而是将其“归还”到池子中，并将其设为非活动状态，以备下次使用。

#### **18.2 Godot中的实现方式**

这个模式在Godot中非常普遍和有效。我们可以创建一个`ObjectPool`节点，它负责实例化、存储、租借和回收特定类型的节点（通常是`PackedScene`的实例）。

#### **18.3 C# 实现：子弹池**

我们将创建一个可用于任何节点的通用对象池，并用它来管理子弹。

**1. 创建对象池**

```csharp
// ObjectPool.cs
using Godot;
using System.Collections.Generic;

public partial class ObjectPool : Node
{
    [Export] private PackedScene _scene;
    [Export] private int _initialSize = 20;

    private Queue<Node> _pool = new Queue<Node>();

    public override void _Ready()
    {
        for (int i = 0; i < _initialSize; i++)
        {
            AddObjectToPool();
        }
    }

    private void AddObjectToPool()
    {
        Node instance = _scene.Instantiate();
        instance.SetProcess(false);
        instance.SetPhysicsProcess(false);
        instance.Visible = false;
        AddChild(instance);
        _pool.Enqueue(instance);
    }

    public Node Acquire()
    {
        if (_pool.Count == 0)
        {
            GD.Print("Pool is empty, creating a new object.");
            AddObjectToPool();
        }

        Node obj = _pool.Dequeue();
        obj.SetProcess(true);
        obj.SetPhysicsProcess(true);
        obj.Visible = true;
        return obj;
    }

    public void Release(Node obj)
    {
        if (obj == null) return;
        
        obj.SetProcess(false);
        obj.SetPhysicsProcess(false);
        obj.Visible = false;
        // 在这里可以添加一个Reset()方法来重置对象状态
        if (obj is IPoolable poolable)
        {
            poolable.Reset();
        }
        _pool.Enqueue(obj);
    }
}

// 可选的接口，用于重置对象状态
public interface IPoolable
{
    void Reset();
}
```

**2. 修改子弹脚本**

子弹不再自我销毁，而是通知池来回收它。

```csharp
// Bullet.cs
public partial class Bullet : Area2D, IPoolable
{
    public ObjectPool Pool { get; set; }

    // ... Start() 和 _PhysicsProcess() 方法 ...

    private void OnHitSomething()
    {
        // 不再调用 QueueFree()
        Pool.Release(this);
    }
    
    public void Reset()
    {
        // 重置需要改变的状态
        this.Position = Vector2.Zero;
    }
}
```

**3. 在武器中使用池**

```csharp
// Gun.cs
using Godot;

public partial class Gun : Node2D
{
    [Export] private ObjectPool _bulletPool;

    public void Shoot()
    {
        Bullet bullet = _bulletPool.Acquire() as Bullet;
        if (bullet != null)
        {
            bullet.Pool = _bulletPool; // 将池的引用传给子弹
            bullet.Start(this.GlobalPosition, this.GlobalRotationDegrees);
        }
    }
}
```

#### **18.4 游戏案例**

- **射击游戏（Shmups）**: 管理海量的子弹和爆炸效果。
- **即时战略游戏 (RTS)**: 管理单位死亡时产生的尸体、血液等视觉效果。
- **粒子系统**: Godot的粒子系统内部就使用了类似对象池的机制来循环使用粒子。
- **任何需要频繁生/灭对象的场景**: 敌人、金币、伤害数值显示等。

#### **18.5 使用建议与注意事项**

- **重置状态**: 从池中取出的对象可能还保留着上一次使用的状态（如位置、速度）。在`Acquire`或`Release`时，务必重置所有必要的状态。创建一个`IPoolable`接口和`Reset()`方法是一个好习惯。
- **池的大小**: 池的初始大小需要根据游戏的典型负载来调整。一个太小的池仍然会导致运行时分配，一个太大的池则会预先占用过多内存。可以实现一个能动态增长的池。
- **调试**: 当对象被“归还”后，它仍然存在于场景树中（只是不活动）。这在调试时可能会造成困惑。确保你清楚地区分了活动和非活动对象。

[GDScript版本待补充]

---

### 第19章 - 空间分区 (Spatial Partition)

#### **19.1 动机**

在游戏世界中，许多交互都是基于“邻近”关系的。一个单位只会攻击它附近的敌人；一个角色只会与它面前的NPC对话；物理碰撞只发生在相互接触的物体之间。 

最朴素的邻近检测算法是“遍历所有，检查所有”。例如，要为一个单位找到所有在攻击范围内的敌人，你需要遍历游戏世界中的 **每一个** 其他单位，计算它们之间的距离。如果有N个单位，这个计算的复杂度是O(N²)。当N很大时，这会迅速成为性能杀手。

空间分区模式通过将游戏世界划分为更小的区域来解决这个问题。一个单位现在只需要检查和它在同一个区域（以及相邻几个区域）内的其他单位，而可以完全忽略远处区域中的单位。这极大地减少了需要进行的检查次数。

常见的空间分区数据结构有：
- **统一网格 (Uniform Grid)**: 将世界划分为大小相同的网格单元。
- **四叉树/八叉树 (Quadtree/Octree)**: 递归地将区域划分为四个/八个子区域，直到每个区域中的对象数量低于某个阈值。适用于对象分布不均匀的场景。
- **BSP树 (Binary Space Partitioning)**: 用平面递归地分割空间。

#### **19.2 Godot中的实现方式**

**好消息是，你几乎不需要自己实现空间分区**。Godot的 **物理引擎**（`PhysicsServer2D`和`PhysicsServer3D`）已经内置了一个高度优化的宽阶段碰撞检测系统，它使用的就是某种高级的空间分区数据结构（如BVH - Bounding Volume Hierarchy）。

当你使用`CharacterBody2D/3D`, `Area2D/3D`, `RigidBody2D/3D`等物理节点时，你已经免费获得了空间分区带来的性能优势。例如，当一个`Area2D`的`body_entered`信号被触发时，引擎已经高效地排除了所有不在该区域附近的物体。

因此，在Godot中应用此模式的最佳方式就是：**相信并使用引擎的内置物理系统**。只有在极少数特定情况下（例如，你需要对非物理对象进行大量的、自定义的邻近查询），才需要考虑手动实现一个空间分区。

#### **19.3 C# 实现：简单的网格分区（用于非物理查询）**

我们将演示如何为非物理对象（例如，只是一些数据点）实现一个简单的统一网格分区，用于快速查询某个点周围的邻居。

```csharp
// SimpleGridPartition.cs
using Godot;
using System.Collections.Generic;

// 假设我们正在管理这些对象
public class Unit { public Vector2 Position; public string Name; }

public class SimpleGridPartition
{
    private int _cellSize;
    private Dictionary<Vector2I, List<Unit>> _grid = new Dictionary<Vector2I, List<Unit>>();

    public SimpleGridPartition(int cellSize) => _cellSize = cellSize;

    private Vector2I WorldToCell(Vector2 worldPos) => new Vector2I((int)(worldPos.X / _cellSize), (int)(worldPos.Y / _cellSize));

    public void Add(Unit unit)
    {
        Vector2I cellPos = WorldToCell(unit.Position);
        if (!_grid.ContainsKey(cellPos)) _grid[cellPos] = new List<Unit>();
        _grid[cellPos].Add(unit);
    }

    public List<Unit> Query(Vector2 position, float radius)
    {
        var results = new List<Unit>();
        Vector2I centerCell = WorldToCell(position);
        int extent = (int)(radius / _cellSize) + 1;

        for (int x = centerCell.X - extent; x <= centerCell.X + extent; x++)
        {
            for (int y = centerCell.Y - extent; y <= centerCell.Y + extent; y++)
            {
                var cellPos = new Vector2I(x, y);
                if (_grid.TryGetValue(cellPos, out var unitsInCell))
                {
                    // 在这里可以进一步精确检查距离
                    results.AddRange(unitsInCell);
                }
            }
        }
        return results;
    }
    
    // ...还需要实现Remove和Update方法...
}
```

这个简单的实现展示了其核心逻辑：查询不再需要检查所有单位，而只需要检查目标点周围的几个网格单元。

#### **19.4 游戏案例**

- **碰撞检测**: 所有现代物理引擎的核心。Godot已经为你做好了。
- **AI感知**: 一个AI单位需要找到它能看到的敌人。使用`Area2D`或`RayCast2D`节点是Godot的推荐方式，它们利用了物理引擎的空间分区。
- **网络优化**: 在多人游戏中，服务器只需要向玩家发送其“感兴趣区域”（Area of Interest）内的更新，而不是整个游戏世界的状态。这个区域就可以通过空间分区来确定。
- **剔除 (Culling)**: 渲染引擎使用空间分区（例如八叉树）来快速确定哪些物体在摄像机视锥体之外，从而不对它们进行渲染。这被称为“视锥剔除”，Godot也自动处理了。

#### **19.5 使用建议与注意事项**

- **优先使用内置物理**: 对于任何需要碰撞检测、重叠查询或射线投射的场景，**始终优先使用Godot的内置节点**（`Area2D`, `RayCast2D`等）。它们的C++底层实现远比你在C#中能写的任何东西都要快。
- **手动实现的场景**: 只有当你处理大量 **非物理** 对象的邻近查询时，才考虑手动实现空间分区。例如，一个有数万棵树的森林，你想快速找到玩家周围可以砍伐的树，而这些树并不需要物理体。
- **选择合适的数据结构**: 统一网格最简单，适用于对象分布均匀的场景。四叉树/八叉树则更适合对象分布不均（例如，城市中心很密集，郊区很稀疏）的场景。

[GDScript版本待补充]

---

## 第六部分：参考资源

本技术文档的撰写综合并参考了以下高质量的在线资源，包括Godot引擎官方文档、权威的游戏开发社区以及经验丰富的开发者博客。这些资料为在Godot C#环境中准确、高效地实现经典游戏编程模式提供了坚实的基础。

### 核心理论

- **[1] Game Programming Patterns by Robert Nystrom**: 本文档的结构和核心理论均基于此书。它对设计模式在游戏开发中的应用进行了精辟的阐述。

### Godot C# 与核心概念

- **[2] Godot Engine - C#/.NET Official Documentation**: [https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html) - (高可靠性) 官方C#文档，是所有C#特性、平台支持和环境设置的权威来源。
- **[3] Godot Engine - C# Basics**: [https://docs.godotengine.org/en/4.4/tutorials/scripting/c_sharp/c_sharp_basics.html](https://docs.godotengine.org/en/4.4/tutorials/scripting/c_sharp/c_sharp_basics.html) - (高可靠性) 官方C#基础教程，详细介绍了API命名约定、项目工作流和性能注意事项。
- **[4] Godot Engine - C# Signals**: [https://docs.godotengine.org/en/4.4/tutorials/scripting/c_sharp/c_sharp_signals.html](https://docs.godotengine.org/en/4.4/tutorials/scripting/c_sharp/c_sharp_signals.html) - (高可靠性) 官方C#信号系统指南，是实现观察者模式的关键参考。

### 模式实现与分析

- **[5] GDQuest - Design patterns in Godot**: [https://gdquest.com/tutorial/godot/design-patterns/intro-to-design-patterns/](https://gdquest.com/tutorial/godot/design-patterns/intro-to-design-patterns/) - (高可靠性) GDQuest是Godot社区的知名教育机构，其教程为多种模式（如状态机、组件）在Godot中的实现提供了深刻见解。
- **[6] KidsCanCode - Node Communication Best Practices**: [https://kidscancode.org/godot_recipes/4.x/basics/node_communication/index.html](https://kidscancode.org/godot_recipes/4.x/basics/node_communication/index.html) - (高可靠性) 提供了节点间通信的黄金法则（向下调用、向上信号），对实现解耦模式非常有帮助。
- **[7] Manuel Sánchez - Top Game Development Patterns in Godot Engine**: [https://www.manuelsanchezdev.com/blog/game-development-patterns](https://www.manuelsanchezdev.com/blog/game-development-patterns) - (中等可靠性) 一位经验丰富的开发者对多种模式在Godot中的应用进行了全面的总结，特别是在对象池和服务定位器方面。
- **[8] Chickensoft - GDScript vs C# in Godot 4**: [https://chickensoft.games/blog/gdscript-vs-csharp](https://chickensoft.games/blog/gdscript-vs-csharp) - (高可靠性) 权威的语言对比分析，为理解C#在Godot生态中的定位和性能特点提供了数据支持。
- **[9] Godot Engine - UndoRedo Class Documentation**: [https://docs.godotengine.org/en/4.4/classes/class_undoredo.html](https://docs.godotengine.org/en/4.4/classes/class_undoredo.html) - (高可靠性) 官方`UndoRedo`类文档，是Godot内置命令模式实现的直接参考。

### 性能与优化

- **[10] Godot Engine - General Optimization Guide**: [https://docs.godotengine.org/en/stable/tutorials/performance/general_optimization.html](https://docs.godotengine.org/en/stable/tutorials/performance/general_optimization.html) - (高可靠性) 官方性能优化指南，为理解数据局部性、脏标记等优化模式的动机提供了理论背景。
- **[11] Godot Forum - Performance Optimization for Bullet Hells**: [https://forum.godotengine.org/t/performance-optimization-for-bullet-hells/49009](https://forum.godotengine.org/t/performance-optimization-for-bullet-hells/49009) - (中等可靠性) 社区的实际案例讨论，证明了对象池模式在高性能场景下的重要性。
