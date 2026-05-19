import {EditorView, basicSetup} from 'codemirror';
import {EditorState} from '@codemirror/state';
import {xml} from '@codemirror/lang-xml';
import {javascript} from '@codemirror/lang-javascript';
import {oneDark} from '@codemirror/theme-one-dark';

(window as any).CM = { EditorView, EditorState, basicSetup, xml, javascript, oneDark };
