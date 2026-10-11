import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { EntityNodeData } from '@/domain/graph';

type EntityNodeDataWithActive = EntityNodeData & { __active?: boolean };

function EntityNodeComponent({
  data,
  selected,
}: NodeProps<EntityNodeDataWithActive>) {
  const isActive = selected || data.__active;

  return (
    <div
      className={`entity-node${isActive ? ' entity-node--selected' : ''}${data.__active ? ' entity-node--cursor-active' : ''
        }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="entity-node__handle"
      />
      <div className="entity-node__label">{data.label}</div>
      <div className="entity-node__meta">
        <span className="entity-node__id">{data.id}</span>
        <span className="entity-node__attrs">
          {data.attributeCount} атр.
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="entity-node__handle"
      />
    </div>
  );
}

export const EntityNode = memo(EntityNodeComponent);