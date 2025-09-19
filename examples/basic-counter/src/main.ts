import { Component } from '@dribble/runtime-client';
import Home from './routes/index';
import Items from './routes/items/[id]';

const app = document.getElementById('app')!;

function mount(component: Component, el: HTMLElement) {
	component.renderInitial(el);
	component.onMount?.(el);
}

// Mount Home (ephemeral)
mount(new Home(), app);

// Also mount Items (persistent example) under a child node
const itemsRoot = document.createElement('div');
itemsRoot.id = 'items-root';
app.appendChild(itemsRoot);
mount(new Items({ id: 2 }), itemsRoot);
