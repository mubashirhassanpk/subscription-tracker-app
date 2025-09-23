import FilterBar from '../FilterBar';
import { useState } from 'react';

export default function FilterBarExample() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  return (
    <FilterBar
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      activeFilter={activeFilter}
      onActiveFilterChange={setActiveFilter}
    />
  );
}