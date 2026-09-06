export interface ToolTaskNode {
  taskId: string;
  toolName: string;
  params: Record<string, any>;
  dependencies: string[]; // taskIds that must complete before this runs
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: any;
}

export interface DAGExecutionWave {
  waveIndex: number;
  parallelTaskIds: string[];
}

export interface DAGPlanResult {
  planId: string;
  totalTasks: number;
  waves: DAGExecutionWave[];
  isAcyclic: boolean;
}

export class DAGToolExecutionPlanner {
  /**
   * Partitions tool task nodes into parallel execution waves using topological dependencies
   */
  public static planExecution(tasks: ToolTaskNode[]): DAGPlanResult {
    const taskMap = new Map<string, ToolTaskNode>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    tasks.forEach(t => {
      taskMap.set(t.taskId, t);
      inDegree.set(t.taskId, t.dependencies.length);
      dependents.set(t.taskId, []);
    });

    tasks.forEach(t => {
      t.dependencies.forEach(depId => {
        if (dependents.has(depId)) {
          dependents.get(depId)!.push(t.taskId);
        }
      });
    });

    const waves: DAGExecutionWave[] = [];
    let currentWaveTasks = tasks.filter(t => (inDegree.get(t.taskId) || 0) === 0).map(t => t.taskId);
    let waveIdx = 0;
    let scheduledCount = 0;

    while (currentWaveTasks.length > 0) {
      waves.push({
        waveIndex: waveIdx++,
        parallelTaskIds: currentWaveTasks
      });
      scheduledCount += currentWaveTasks.length;

      const nextWave: string[] = [];
      for (const completedTaskId of currentWaveTasks) {
        const nextTasks = dependents.get(completedTaskId) || [];
        for (const nextId of nextTasks) {
          const rem = (inDegree.get(nextId) || 1) - 1;
          inDegree.set(nextId, rem);
          if (rem === 0) {
            nextWave.push(nextId);
          }
        }
      }
      currentWaveTasks = nextWave;
    }

    return {
      planId: `plan_${Date.now()}`,
      totalTasks: tasks.length,
      waves,
      isAcyclic: scheduledCount === tasks.length
    };
  }
}
