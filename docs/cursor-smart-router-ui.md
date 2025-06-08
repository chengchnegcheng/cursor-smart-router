# Cursor智能路由插件 UI设计文档 🎨

## 一、界面概览

### 1.1 主要界面组件

使用现代化的Magic UI组件，我们将创建一个直观且美观的用户界面：

```typescript
import {
  MagicCard,
  AnimatedCircularProgressBar,
  BentoGrid,
  Terminal,
  ScrollProgress,
  AnimatedList,
  ShinyButton,
  NeonGradientCard
} from '@cursor/magic-ui';
```

### 1.2 布局设计

```jsx
<div className="cursor-router-container">
  {/* 顶部状态栏 */}
  <ScrollProgress />
  
  {/* 主控制面板 */}
  <MagicCard className="main-dashboard">
    <StatusPanel />
    <ModelSelector />
    <PerformanceMetrics />
  </MagicCard>
</div>
```

## 二、核心组件设计

### 2.1 状态面板 (StatusPanel)

使用`NeonGradientCard`展示当前状态：

```jsx
const StatusPanel = () => {
  return (
    <NeonGradientCard className="status-panel">
      <AnimatedCircularProgressBar
        percentage={fastRequestsRemaining}
        color="#4CAF50"
      />
      <div className="status-info">
        <h3>当前状态</h3>
        <p>Pro会员：{isPro ? '✅' : '❌'}</p>
        <p>快速请求剩余：{fastRequestsRemaining}</p>
        <p>当前模型：{currentModel}</p>
      </div>
    </NeonGradientCard>
  );
};
```

### 2.2 模型选择器 (ModelSelector)

使用`BentoGrid`展示可用模型：

```jsx
const ModelSelector = () => {
  return (
    <BentoGrid className="model-grid">
      {MODEL_PRIORITY.map(model => (
        <ModelCard
          key={model}
          name={model}
          status={getModelStatus(model)}
          latency={getModelLatency(model)}
        />
      ))}
    </BentoGrid>
  );
};
```

### 2.3 性能指标 (PerformanceMetrics)

使用`AnimatedList`展示实时性能数据：

```jsx
const PerformanceMetrics = () => {
  return (
    <div className="metrics-container">
      <h3>性能监控</h3>
      <AnimatedList
        items={[
          { label: '平均响应时间', value: '2.3s' },
          { label: '切换成功率', value: '98%' },
          { label: '当前负载', value: '45%' }
        ]}
      />
    </div>
  );
};
```

## 三、交互设计

### 3.1 操作按钮

使用`ShinyButton`组件实现主要操作按钮：

```jsx
<ShinyButton
  onClick={handleModelSwitch}
  className="action-button"
>
  切换至快速模式
</ShinyButton>
```

### 3.2 终端展示

使用`Terminal`组件显示操作日志：

```jsx
<Terminal
  className="operation-log"
  commands={[
    {
      command: '切换至Claude-3.5',
      output: '成功切换模型，响应时间优化40%'
    }
  ]}
/>
```

## 四、样式主题

### 4.1 配色方案

```css
:root {
  --primary: #2563eb;
  --secondary: #4f46e5;
  --accent: #06b6d4;
  --background: #0f172a;
  --text: #f8fafc;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
}
```

### 4.2 响应式设计

```css
.cursor-router-container {
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
  
  @media (min-width: 769px) {
    grid-template-columns: 2fr 1fr;
  }
}
```

## 五、动画效果

### 5.1 状态切换动画

```typescript
const switchAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};
```

### 5.2 加载动画

```jsx
<AnimatedCircularProgressBar
  percentage={loadingProgress}
  color={getProgressColor(loadingProgress)}
  animation={{
    duration: 1000,
    easing: 'easeInOut'
  }}
/>
```

## 六、交互反馈

### 6.1 提示消息

```typescript
const showNotification = (message: string, type: 'success' | 'warning' | 'error') => {
  return (
    <NeonGradientCard className={`notification ${type}`}>
      <p>{message}</p>
      <AnimatedProgressBar duration={3000} />
    </NeonGradientCard>
  );
};
```

### 6.2 操作确认

```jsx
const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <MagicCard className="confirm-dialog">
      <p>{message}</p>
      <div className="actions">
        <ShinyButton onClick={onConfirm}>确认</ShinyButton>
        <ShinyButton variant="outline" onClick={onCancel}>取消</ShinyButton>
      </div>
    </MagicCard>
  );
};
```

## 七、辅助功能

### 7.1 键盘快捷键

```typescript
const shortcuts = {
  'Ctrl + M': '切换模型',
  'Ctrl + R': '刷新状态',
  'Ctrl + D': '显示详情'
};
```

### 7.2 工具提示

```jsx
<Tooltip
  content="当前模型状态良好，响应时间 < 2s"
  position="top"
  theme="dark"
>
  <StatusIndicator status="good" />
</Tooltip>
```

## 八、性能优化

### 8.1 组件懒加载

```typescript
const LazyModelSelector = React.lazy(() => import('./ModelSelector'));
const LazyPerformanceMetrics = React.lazy(() => import('./PerformanceMetrics'));
```

### 8.2 状态管理

```typescript
const routerStore = create((set) => ({
  currentModel: 'Claude-3.5-Sonnet',
  performance: {
    latency: 0,
    successRate: 100,
    load: 0
  },
  updateMetrics: (metrics) => set((state) => ({
    performance: { ...state.performance, ...metrics }
  }))
}));
```

## 九、部署说明

### 9.1 构建配置

```json
{
  "build": {
    "outDir": "dist",
    "minify": true,
    "sourcemap": true,
    "cssCodeSplit": true
  }
}
```

### 9.2 环境变量

```env
VITE_API_ENDPOINT=https://api.cursor.sh
VITE_WEBSOCKET_URL=wss://ws.cursor.sh
VITE_DEBUG_MODE=false
```

## 十、测试计划

### 10.1 UI测试用例

```typescript
describe('RouterUI', () => {
  it('should display correct model status', () => {
    render(<StatusPanel />);
    expect(screen.getByText(/当前模型/)).toBeInTheDocument();
  });

  it('should handle model switching', async () => {
    render(<ModelSelector />);
    await userEvent.click(screen.getByText('Claude-3.5'));
    expect(screen.getByText('切换成功')).toBeInTheDocument();
  });
});
```

### 10.2 性能测试

```typescript
describe('Performance', () => {
  it('should render main dashboard under 100ms', () => {
    const start = performance.now();
    render(<Dashboard />);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```