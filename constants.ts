
import { FilesState, AiActionType } from './types';

const COUNTER_APP_FILES: FilesState = {
  'App.tsx': {
    name: 'App.tsx',
    content: `
import React, { useState } from 'react';
import Button from './components/Button';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const AppContent: React.FC = () => {
  const [count, setCount] = useState(0);
  const { theme } = useTheme();

  return (
    <div className={\`p-6 min-h-screen flex flex-col items-center justify-center transition-colors duration-300 \${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}\`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-opacity-50 backdrop-filter backdrop-blur-lg p-8 rounded-xl shadow-2xl w-full max-w-md \${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}">
        <h1 className="text-4xl font-bold mb-6 text-center \${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}">Counter App</h1>
        <p className="text-2xl mb-6 text-center">Count: {count}</p>
        <div className="flex justify-center space-x-3">
          <Button onClick={() => setCount(c => c + 1)} variant="primary">Increment</Button>
          <Button onClick={() => setCount(c => c - 1)} variant="secondary">Decrement</Button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App;
`
  },
  'components/Button.tsx': {
    name: 'components/Button.tsx',
    content: `
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'custom';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '' }) => {
  const { theme } = useTheme();
  let baseStyle = 'font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50';

  if (variant === 'primary') {
    baseStyle += theme === 'dark' 
      ? ' bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-400' 
      : ' bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500';
  } else if (variant === 'secondary') {
    baseStyle += theme === 'dark' 
      ? ' bg-gray-600 hover:bg-gray-500 text-gray-100 focus:ring-gray-400' 
      : ' bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400';
  } else if (variant === 'danger') {
    baseStyle += theme === 'dark'
      ? ' bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
      : ' bg-red-500 hover:bg-red-600 text-white focus:ring-red-400';
  }

  return (
    <button
      onClick={onClick}
      className={\`\${baseStyle} \${className}\`}
    >
      {children}
    </button>
  );
};

export default Button;
`
  },
   'components/ThemeToggle.tsx': {
    name: 'components/ThemeToggle.tsx',
    content: `
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from './Icons';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={\`p-2 rounded-full focus:outline-none focus:ring-2 \${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 focus:ring-yellow-400' : 'bg-gray-200 hover:bg-gray-300 focus:ring-indigo-500'}\`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-6 h-6 text-yellow-400" />
      ) : (
        <MoonIcon className="w-6 h-6 text-indigo-600" />
      )}
    </button>
  );
};

export default ThemeToggle;
`
  },
  'contexts/ThemeContext.tsx': {
    name: 'contexts/ThemeContext.tsx',
    content: `
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    return storedTheme || 'dark'; // Default to dark theme
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
`
  },
  'types.ts': { // This types.ts is specific to the Counter App example
    name: 'types.ts',
    content: `
// Types for the Counter App
export interface DummyCounterType {
  value: number;
}
`
  }
};

const TODO_APP_FILES: FilesState = {
  'TodoApp.tsx': {
    name: 'TodoApp.tsx',
    content: `
import React, { useState } from 'react';
import TodoList from './components/TodoList';
import AddTodoForm from './components/AddTodoForm';
import { Todo } from './types';

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (text: string) => {
    const newTodo: Todo = { id: Date.now(), text, completed: false };
    setTodos(prevTodos => [...prevTodos, newTodo]);
  };

  const toggleTodo = (id: number) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const removeTodo = (id: number) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100 flex justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-600">Todo List</h1>
        <AddTodoForm onAddTodo={addTodo} />
        <TodoList todos={todos} onToggleTodo={toggleTodo} onRemoveTodo={removeTodo} />
      </div>
    </div>
  );
};

export default TodoApp;
`
  },
  'components/TodoList.tsx': {
    name: 'components/TodoList.tsx',
    content: `
import React from 'react';
import TodoItem from './TodoItem';
import { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  onToggleTodo: (id: number) => void;
  onRemoveTodo: (id: number) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggleTodo, onRemoveTodo }) => {
  if (todos.length === 0) {
    return <p className="text-gray-500 text-center mt-4">No todos yet. Add some!</p>;
  }
  return (
    <ul className="mt-4 space-y-2">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
        />
      ))}
    </ul>
  );
};

export default TodoList;
`
  },
  'components/TodoItem.tsx': {
    name: 'components/TodoItem.tsx',
    content: `
import React from 'react';
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onRemove }) => {
  return (
    <li className={\`flex items-center justify-between p-3 rounded-md \${todo.completed ? 'bg-green-100' : 'bg-gray-50'}\`}>
      <span
        onClick={() => onToggle(todo.id)}
        className={\`cursor-pointer \${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}\`}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onRemove(todo.id)}
        className="ml-4 text-red-500 hover:text-red-700 text-sm font-medium"
      >
        Remove
      </button>
    </li>
  );
};

export default TodoItem;
`
  },
  'components/AddTodoForm.tsx': {
    name: 'components/AddTodoForm.tsx',
    content: `
import React, { useState } from 'react';

interface AddTodoFormProps {
  onAddTodo: (text: string) => void;
}

const AddTodoForm: React.FC<AddTodoFormProps> = ({ onAddTodo }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddTodo(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a new todo"
        className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <button type="submit" className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
        Add
      </button>
    </form>
  );
};

export default AddTodoForm;
`
  },
  'types.ts': { // This types.ts is specific to the Todo App example
    name: 'types.ts',
    content: `
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
`
  }
};

export const PROJECT_EXAMPLES: Record<string, { name: string, files: FilesState }> = {
  counterApp: { name: 'Counter App (React/TS)', files: COUNTER_APP_FILES },
  todoApp: { name: 'Todo App (React/TS)', files: TODO_APP_FILES },
};

export const DEFAULT_PROJECT_KEY = 'counterApp';

export const GEMINI_SYSTEM_PROMPT_TEMPLATE = `You are 'Hue', an advanced AI coding assistant. You help users modify a small React/TypeScript project.
Your process is:
1. Understand the user's request.
2. Create a concise, step-by-step plan. Each step should clearly state the file to be modified or created, and the high-level change. Prefix plan steps with '${AiActionType.PLAN}'. Example: '${AiActionType.PLAN} Modify \`App.tsx\` to import a new component.' or '${AiActionType.PLAN} Create new file \`components/NewComponent.tsx\` with basic structure.'
3. Execute each step by generating the COMPLETE new content for the specified file. When providing code, ensure it is valid TypeScript/TSX. Wrap the code ONLY in a single \`\`\`tsx ... \`\`\` block. Your response for this should be: '${AiActionType.CODE_UPDATE} \`FILENAME_OR_PATH\`\\n\`\`\`tsx\\n// new content here\\n\`\`\`'. If creating a new file, use the new file path.
4. After generating code for a step, briefly state '${AiActionType.SIMULATING_TEST} Reviewing \`FILENAME_OR_PATH\`.'
5. Then, provide a brief review: '${AiActionType.TEST_RESULT} \`FILENAME_OR_PATH\` - Looks good.' or '${AiActionType.TEST_RESULT} \`FILENAME_OR_PATH\` - Found an issue: [description].'. If an issue is found, DO NOT try to fix it immediately. Wait for the user to potentially ask for a fix. State the issue clearly.
6. If the user asks to fix an issue you found, or make further modifications to the last generated code, use the '${AiActionType.CODE_UPDATE}' format again for that file.
7. When the entire task, including any fixes, is done, say '${AiActionType.TASK_COMPLETE}'.
8. If you cannot fulfill a request or encounter an unrecoverable error, state '${AiActionType.ERROR} [description]'.

User will provide their request and the current state of relevant files.
Focus on one file modification per step unless the changes are very tightly coupled and trivial.
Be precise and stick to the requested formats for PLAN, CODE_UPDATE, SIMULATING_TEST, TEST_RESULT, and TASK_COMPLETE.
The project files are initially: {{FILE_NAMES}}. You can add new files if necessary (e.g. \`components/NewComponent.tsx\`).
Do not use markdown for anything other than the code block.
Your entire response for each turn should be a sequence of these actions, if applicable. For example, a plan might be multiple PLAN: lines. Code generation will be one CODE_UPDATE:, followed by SIMULATING_TEST:, then TEST_RESULT:.
Do not add any conversational fluff or explanations outside of these structured responses.
If asked to make a small change to an existing file, you must still provide the FULL content of the file, not just a diff or snippet.
Example of responding with a plan:
${AiActionType.PLAN} Modify \`App.tsx\` to add a new state variable.
${AiActionType.PLAN} Update \`components/Button.tsx\` to accept a new prop.

Example of responding with code:
${AiActionType.CODE_UPDATE} \`App.tsx\`
\`\`\`tsx
// full new content of App.tsx
import React from 'react';
// ...rest of the file
export default App;
\`\`\`
${AiActionType.SIMULATING_TEST} Reviewing \`App.tsx\`.
${AiActionType.TEST_RESULT} \`App.tsx\` - Looks good.
${AiActionType.TASK_COMPLETE} (if this was the only step or final step)
`;