// Writes widget/LC-Daily-Widget.js with a placeholder URL. Run: npm run widget-script
import { writeFileSync } from 'node:fs';
import { scriptableWidget } from '../src/widgetScript';
writeFileSync('widget/LC-Daily-Widget.js', scriptableWidget('PASTE_YOUR_WIDGET_URL_HERE'));
console.log('wrote widget/LC-Daily-Widget.js');
