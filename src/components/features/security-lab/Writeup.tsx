import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Textarea } from '../../ui/textarea';
import { FileText, ClipboardPaste, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useHTBStore, type HTBProject } from '../../../stores/htbStore';

interface WriteupProps {
  selected: HTBProject;
  generatedMarkdown: string;
  writeupEffective: string;
}

export const Writeup: React.FC<WriteupProps> = ({
  selected,
  generatedMarkdown,
  writeupEffective
}) => {
  const { updateProject } = useHTBStore();

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="w-4 h-4" /> Rédaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea 
            rows={20} 
            value={selected.writeupMarkdown || generatedMarkdown} 
            onChange={(e)=>updateProject(selected.id,{ writeupMarkdown: e.target.value })} 
            className="w-full bg-slate-900 border-slate-700 text-slate-100 font-mono" 
          />
          <div className="flex gap-2">
            <Button 
              className="bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600" 
              variant="outline" 
              onClick={() => navigator.clipboard.writeText(writeupEffective)}
            >
              <ClipboardPaste className="w-4 h-4 mr-2" /> Copier
            </Button>
            <Button 
              className="bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600" 
              variant="outline" 
              onClick={()=>{
                const blob = new Blob([writeupEffective], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${selected.name.replace(/\s+/g,'_')}.md`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Télécharger
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="w-4 h-4" /> Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {writeupEffective}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
