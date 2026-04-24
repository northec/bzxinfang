# 滨州市住建领域信访管理平台 - 设计文档

## 1. 数据模型

### cases（案件表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| case_no | String @unique | 案件编号 BZ-YYYYMMDD-NNN |
| title | String | 案件标题 |
| petitioner_name | String | 信访人姓名 |
| petitioner_phone | String | 信访人电话 |
| case_type | String | 清欠/房产/物业/市政/其他 |
| source | String | 12345/小程序/国务院督查/信访局/其他 |
| content | String | 案件内容 |
| status | String @default("新建") | 新建/已分派/已签收/办理中/待审核/已完成/已撤案/已合并 |
| parent_id | Int? | 父案件ID（拆分时） |
| is_main | Boolean @default(true) | 是否主办件 |
| dispatch_department_id | Int? | 主办科室ID |
| co_departments | String? | 协办科室ID列表JSON |
| deadline | DateTime? | 办结时限 |
| handler_id | Int? | 办案人ID |
| created_at | DateTime @default(now()) | 创建时间 |
| updated_at | DateTime @updatedAt | 更新时间 |

### case_progress（办理进度表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| case_id | Int | 案件ID |
| operator_id | Int | 操作人ID |
| action | String | 动作名称 |
| description | String | 描述 |
| old_status | String? | 原状态 |
| new_status | String? | 新状态 |
| created_at | DateTime @default(now()) | 记录时间 |

### departments（部门表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| name | String | 部门名称 |
| parent_id | Int? | 上级部门ID |
| type | String | 主管部门/办案科室 |
| leader_id | Int? | 负责人ID |

### users（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| username | String @unique | 用户名 |
| password_hash | String | 密码哈希 |
| name | String | 姓名 |
| department_id | Int? | 所属部门 |
| role | String | admin/supervisor/handler |
| phone | String? | 电话 |
| created_at | DateTime @default(now()) | 创建时间 |

### attachments（附件表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| case_id | Int | 案件ID |
| filename | String | 文件名 |
| filepath | String | 存储路径 |
| uploader_id | Int | 上传人ID |
| created_at | DateTime @default(now()) | 上传时间 |

### merge_records（合并记录表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id @increment | 主键 |
| main_case_id | Int | 主办件ID |
| merged_case_ids | String | 被合并案件ID列表JSON |
| merged_at | DateTime @default(now()) | 合并时间 |
| merged_by | Int | 操作人ID |

## 2. API 列表

### 认证
- POST /api/auth/login - 登录
- GET /api/auth/me - 获取当前用户

### 案件管理
- GET /api/cases - 案件列表（支持分页、筛选）
- POST /api/cases - 新建案件
- GET /api/cases/:id - 案件详情
- PUT /api/cases/:id - 更新案件
- POST /api/cases/import - Excel批量导入
- POST /api/cases/:id/split - 拆分案件
- POST /api/cases/merge - 合并案件
- POST /api/cases/:id/unmerge - 取消合并
- POST /api/cases/batch-withdraw - 批量撤案
- POST /api/cases/:id/urge - 催办

### 任务分派
- POST /api/cases/:id/dispatch - 分派案件
- POST /api/cases/:id/accept - 签收案件
- POST /api/cases/:id/process - 办理案件
- POST /api/cases/:id/submit-review - 提交审核
- POST /api/cases/:id/complete - 完成结案
- POST /api/cases/:id/reject - 驳回

### 办理进度
- GET /api/cases/:id/progress - 获取进度记录

### 附件
- POST /api/cases/:id/attachments - 上传附件
- GET /api/cases/:id/attachments - 获取附件列表
- GET /api/attachments/:id/download - 下载附件

### 统计
- GET /api/stats/dashboard - 看板数据
- GET /api/stats/type-distribution - 案件类型分布
- GET /api/stats/source-distribution - 来源分布
- GET /api/stats/timeliness - 时效分析

### 基础配置
- GET /api/departments - 部门列表
- POST /api/departments - 新建部门
- PUT /api/departments/:id - 更新部门
- DELETE /api/departments/:id - 删除部门
- GET /api/users - 用户列表
- POST /api/users - 新建用户
- PUT /api/users/:id - 更新用户
- DELETE /api/users/:id - 删除用户

## 3. 前端页面路由

| 路径 | 页面 | 权限 |
|------|------|------|
| /login | 登录页 | 公开 |
| / | 工作台 | 所有角色 |
| /cases | 案件管理 | admin, supervisor |
| /cases/new | 新建案件 | admin, supervisor |
| /cases/:id | 案件详情 | 所有角色 |
| /dispatch | 任务分派 | admin, supervisor |
| /my-tasks | 我的任务 | handler |
| /stats | 统计看板 | admin, supervisor |
| /config/departments | 部门管理 | admin |
| /config/users | 用户管理 | admin |

## 4. 状态流转

新建 → 已分派 → 已签收 → 办理中 → 待审核 → 已完成
                                                      → 已撤案（任意阶段可撤）
新建 → 已合并（合并后状态）
