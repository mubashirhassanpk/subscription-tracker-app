import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { useState } from "react";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  activeFilter: 'all' | 'active' | 'inactive';
  onActiveFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
}

const categories = [
  'All',
  'Entertainment', 
  'Productivity',
  'Health',
  'Education',
  'Gaming',
  'News',
  'Other'
];

export default function FilterBar({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  activeFilter,
  onActiveFilterChange
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearAllFilters = () => {
    onSearchChange('');
    onCategoryChange('All');
    onActiveFilterChange('all');
    console.log('Filters cleared');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'All' || activeFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <div>
            <h4 className="text-sm font-medium mb-2">Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    onCategoryChange(category);
                    console.log('Category selected:', category);
                  }}
                  data-testid={`badge-category-${category.toLowerCase()}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Status</h4>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ].map((status) => (
                <Badge
                  key={status.value}
                  variant={activeFilter === status.value ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    onActiveFilterChange(status.value as 'all' | 'active' | 'inactive');
                    console.log('Status filter:', status.value);
                  }}
                  data-testid={`badge-status-${status.value}`}
                >
                  {status.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}