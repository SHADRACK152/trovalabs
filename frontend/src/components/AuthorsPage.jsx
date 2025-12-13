import React from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementList from './ManagementList';
import luminoAPI from '../services/api';
import { CheckCircle } from 'lucide-react';

const AuthorsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="max-w-4xl w-full bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Authors</h2>
            <span className="inline-flex items-center text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded"> <CheckCircle className="w-4 h-4 mr-1" /> Implemented</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="text-sm text-purple-300 hover:text-white">Back</button>
          </div>
        </div>

        <ManagementList
          title="Authors"
          listFn={luminoAPI.listAuthors}
          createFn={luminoAPI.createAuthor}
          updateFn={luminoAPI.updateAuthor}
          deleteFn={luminoAPI.deleteAuthor}
          itemNameKey="name"
        />
      </div>
    </div>
  );
};

export default AuthorsPage;
